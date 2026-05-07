import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin.server";
import {
  sendAppointmentReminder24h,
  sendVaccineReminder,
} from "@/lib/notifications/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron diario consolidado de WhatsApp.
 *
 * Procesa, en orden, dos tipos de recordatorio:
 *   1. Recordatorio 24h: citas confirmadas para mañana (TZ Chile) sin reminder.
 *   2. Vacunas próximas a vencer: reminders pendientes con due_date dentro
 *      de los próximos 7 días (incluido hoy si quedó atrasado).
 *
 * Frecuencia: 1x al día (Vercel Hobby). Slot 13:00 UTC = 9-10am Chile.
 * Idempotencia: cada dispatcher marca su flag (`appointments.reminder_sent`
 * o `reminders.status='sent'`) al éxito para que la siguiente corrida no
 * reprocese.
 *
 * Auth: header `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // -------------------------------------------------
  // Mañana en TZ Chile (no UTC).
  // -------------------------------------------------
  const todayChile = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Santiago",
  }).format(new Date());
  const [y, m, d] = todayChile.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1));
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);
  const sevenDaysOut = new Date(Date.UTC(y, m - 1, d + 7));
  const sevenDaysOutIso = sevenDaysOut.toISOString().slice(0, 10);

  // -------------------------------------------------
  // 1) Recordatorio 24h de citas confirmadas.
  // -------------------------------------------------
  const apptCounts = { scanned: 0, sent: 0, skipped: 0, failed: 0 };
  const apptErrors: Array<{ id: string; reason: string }> = [];

  const { data: appts, error: apptsErr } = await supabase
    .from("appointments")
    .select("id")
    .eq("date", tomorrowIso)
    .eq("status", "confirmed")
    .eq("reminder_sent", false);

  if (apptsErr) {
    return NextResponse.json(
      { error: `supabase appointments: ${apptsErr.message}` },
      { status: 500 },
    );
  }

  apptCounts.scanned = appts?.length ?? 0;

  for (const appt of appts ?? []) {
    const result = await sendAppointmentReminder24h(appt.id);
    if (result.ok) apptCounts.sent++;
    else if (isSkippableReason(result.reason)) apptCounts.skipped++;
    else {
      apptCounts.failed++;
      apptErrors.push({ id: appt.id, reason: result.reason });
    }
  }

  // -------------------------------------------------
  // 2) Recordatorio de vacunas próximas (hoy → +7 días).
  // -------------------------------------------------
  const vaccCounts = { scanned: 0, sent: 0, skipped: 0, failed: 0 };
  const vaccErrors: Array<{ id: string; reason: string }> = [];

  const { data: reminders, error: remErr } = await supabase
    .from("reminders")
    .select("id")
    .eq("type", "vaccination")
    .eq("status", "pending")
    .gte("due_date", todayChile)
    .lte("due_date", sevenDaysOutIso);

  if (remErr) {
    return NextResponse.json(
      { error: `supabase reminders: ${remErr.message}` },
      { status: 500 },
    );
  }

  vaccCounts.scanned = reminders?.length ?? 0;

  for (const rem of reminders ?? []) {
    const result = await sendVaccineReminder(rem.id);
    if (result.ok) vaccCounts.sent++;
    else if (isSkippableReason(result.reason)) vaccCounts.skipped++;
    else {
      vaccCounts.failed++;
      vaccErrors.push({ id: rem.id, reason: result.reason });
    }
  }

  return NextResponse.json({
    ok: true,
    today: todayChile,
    appointments_24h: { date: tomorrowIso, ...apptCounts, errors: apptErrors },
    vaccines: {
      window: `${todayChile}..${sevenDaysOutIso}`,
      ...vaccCounts,
      errors: vaccErrors,
    },
  });
}

function isSkippableReason(reason: string): boolean {
  return (
    reason.includes("disabled") ||
    reason.includes("=false") ||
    reason.includes("opt-out") ||
    reason.includes("missing") ||
    reason.includes("no configurado") ||
    reason.includes("only confirmed") ||
    reason.includes("only pending") ||
    reason.includes("already sent")
  );
}
