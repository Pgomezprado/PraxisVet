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
 * Cron diario (corre 2 veces/día vía Vercel Cron).
 *
 * Para cada cita agendada para MAÑANA en una clínica con
 * `whatsapp_reminders_enabled=true`, envía un recordatorio WhatsApp al tutor
 * si tiene `whatsapp_opt_in=true` y `phone_e164` válido.
 *
 * Es idempotente: filtra por `reminder_sent=false` y marca `true` solo si el
 * envío fue aceptado por el provider. Re-intentar no duplica mensajes.
 *
 * Auth: Bearer CRON_SECRET (Vercel Cron lo inyecta cuando está configurado).
 */
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

  const supabase = createAdminClient();
  const tomorrow = addDays(new Date(), 1);
  const tomorrowISO = format(tomorrow, "yyyy-MM-dd");

  // Citas de mañana que todavía no han enviado recordatorio, con sus relaciones
  // necesarias: tutor, mascota, profesional asignado y organización.
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(
      `
      id, date, start_time, status, org_id, reminder_sent,
      pets ( id, name ),
      clients ( id, first_name, phone_e164, whatsapp_opt_in ),
      organization_members!appointments_assigned_to_fkey ( first_name, last_name ),
      organizations!inner ( id, name, whatsapp_reminders_enabled )
    `
    )
    .eq("date", tomorrowISO)
    .eq("reminder_sent", false)
    .in("status", ["pending", "confirmed"])
    .eq("organizations.whatsapp_reminders_enabled", true);

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

    const assignee = raw.organization_members;
    const professionalName = assignee?.first_name
      ? `${assignee.first_name}${
          assignee.last_name ? " " + assignee.last_name : ""
        }`
      : "tu profesional";

    const dateLabel = format(new Date(raw.date + "T12:00:00"), "dd-MM");
    const timeLabel = raw.start_time.slice(0, 5);

    const message = buildApptReminder24h(client.phone_e164, {
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

    // Provider aceptó el envío (queued/sent). Marcamos la cita como enviada
    // para no reintentar en la siguiente pasada del cron.
    await supabase
      .from("appointments")
      .update({ reminder_sent: true })
      .eq("id", raw.id);
    sent++;
  }

  return NextResponse.json({
    ok: true,
    date: tomorrowISO,
    scanned,
    sent,
    failed,
    skipped,
  });
}
