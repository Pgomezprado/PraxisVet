import { NextResponse } from "next/server";
import { addDays, format } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin.server";
import {
  buildApptReminder24h,
  getWhatsAppProvider,
} from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron diario (1x/día — Vercel Hobby).
 *
 * Para cada cita agendada para MAÑANA en una clínica con master switch
 * `whatsapp_reminders_enabled=true` y sub-toggle
 * `whatsapp_appt_reminder_24h_enabled=true`, envía un recordatorio WhatsApp
 * al tutor si tiene `whatsapp_opt_in=true` y `phone_e164` válido.
 *
 * Idempotencia: filtra por `reminder_sent=false` y marca `true` solo si el
 * envío fue aceptado. Re-ejecutar no duplica.
 *
 * Rate limit: máx 50 envíos/org/ejecución. Si se alcanza, las citas restantes
 * de esa org quedan sin marcar y se reintentarán mañana.
 *
 * Dry-run: si `WHATSAPP_DRY_RUN_TO` está set, todos los mensajes van a ese
 * número y se loguea `payload.dry_run=true`.
 *
 * Kill switch: `WHATSAPP_KILL_SWITCH=true` corta todo el envío.
 *
 * Auth: Bearer CRON_SECRET (Vercel Cron lo inyecta cuando está configurado).
 */

const MAX_PER_ORG_PER_RUN = 50;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (process.env.WHATSAPP_KILL_SWITCH === "true") {
    return NextResponse.json({
      ok: true,
      killSwitch: true,
      scanned: 0,
      sent: 0,
    });
  }

  const provider = getWhatsAppProvider();
  if (!provider) {
    return NextResponse.json(
      {
        error:
          "WhatsApp provider not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM)",
      },
      { status: 503 }
    );
  }

  const dryRunTo = process.env.WHATSAPP_DRY_RUN_TO?.trim() || null;

  const supabase = createAdminClient();
  const tomorrow = addDays(new Date(), 1);
  const tomorrowISO = format(tomorrow, "yyyy-MM-dd");

  // Citas de mañana, master switch + sub-toggle 24h activos en la clínica.
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(
      `
      id, date, start_time, status, org_id, reminder_sent,
      pets ( id, name ),
      clients ( id, first_name, phone_e164, whatsapp_opt_in ),
      organization_members!appointments_assigned_to_fkey ( first_name, last_name ),
      organizations!inner ( id, name, whatsapp_reminders_enabled, whatsapp_appt_reminder_24h_enabled )
    `
    )
    .eq("date", tomorrowISO)
    .eq("reminder_sent", false)
    .in("status", ["pending", "confirmed"])
    .eq("organizations.whatsapp_reminders_enabled", true)
    .eq("organizations.whatsapp_appt_reminder_24h_enabled", true);

  if (error) {
    return NextResponse.json(
      { error: `supabase: ${error.message}` },
      { status: 500 }
    );
  }

  type Row = {
    id: string;
    date: string;
    start_time: string;
    status: string;
    org_id: string;
    reminder_sent: boolean;
    pets: { id: string; name: string } | null;
    clients: {
      id: string;
      first_name: string;
      phone_e164: string | null;
      whatsapp_opt_in: boolean;
    } | null;
    organization_members: {
      first_name: string | null;
      last_name: string | null;
    } | null;
    organizations: { id: string; name: string } | null;
  };

  let scanned = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let rateLimited = 0;

  // Contador por org para rate limit duro intra-ejecución.
  const sentByOrg = new Map<string, number>();

  for (const raw of (appointments ?? []) as unknown as Row[]) {
    scanned++;

    const client = raw.clients;
    const pet = raw.pets;
    const org = raw.organizations;

    if (!client || !pet || !org) {
      skipped++;
      continue;
    }
    if (!client.whatsapp_opt_in || !client.phone_e164) {
      skipped++;
      continue;
    }

    const orgCount = sentByOrg.get(org.id) ?? 0;
    if (orgCount >= MAX_PER_ORG_PER_RUN) {
      // Dejamos reminder_sent=false para reintento mañana (no quemamos la cita).
      rateLimited++;
      continue;
    }

    const assignee = raw.organization_members;
    const professionalName = assignee?.first_name
      ? `${assignee.first_name}${
          assignee.last_name ? " " + assignee.last_name : ""
        }`
      : "tu profesional";

    const dateLabel = format(new Date(raw.date + "T12:00:00"), "dd-MM");
    const timeLabel = raw.start_time.slice(0, 5);

    // Dry-run: solo redirige destinatario. La auditoría queda en
    // notification_logs.payload (dry_run + real_to + tutor) — no contaminamos
    // el mensaje porque WhatsApp templates solo permiten sustituir variables
    // y el prefijo rompe la lectura del template real.
    const realTo = client.phone_e164;
    const sendTo = dryRunTo ?? realTo;

    const message = buildApptReminder24h(sendTo, {
      tutorFirstName: client.first_name,
      petName: pet.name,
      professionalName,
      dateLabel,
      timeLabel,
      clinicName: org.name,
    });

    const result = await provider.sendTemplate(message);

    const payload = {
      tutor: client.first_name,
      pet: pet.name,
      date: dateLabel,
      time: timeLabel,
      professional: professionalName,
      dry_run: Boolean(dryRunTo),
      real_to: realTo,
      sent_to: sendTo,
    };

    await supabase.from("notification_logs").insert({
      org_id: org.id,
      client_id: client.id,
      pet_id: pet.id,
      appointment_id: raw.id,
      channel: "whatsapp",
      template: message.template,
      status: result.status,
      provider_message_id: result.providerMessageId ?? null,
      error_code: result.errorCode ?? null,
      error_message: result.errorMessage ?? null,
      payload,
    });

    if (result.status === "failed") {
      failed++;
      continue;
    }

    // Provider aceptó (queued/sent). Marcamos para no reintentar.
    await supabase
      .from("appointments")
      .update({ reminder_sent: true })
      .eq("id", raw.id);
    sent++;
    sentByOrg.set(org.id, orgCount + 1);
  }

  return NextResponse.json({
    ok: true,
    date: tomorrowISO,
    scanned,
    sent,
    failed,
    skipped,
    rateLimited,
    dryRun: Boolean(dryRunTo),
  });
}
