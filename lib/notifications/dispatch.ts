import "server-only";
import { format } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin.server";
import { buildApptConfirmation } from "./templates";
import { getWhatsAppProvider } from "./index";

export type DispatchResult =
  | { status: "noop"; reason: string }
  | { status: "sent"; providerMessageId?: string }
  | { status: "queued"; providerMessageId?: string }
  | { status: "failed"; error: string };

/**
 * Envía la confirmación inmediata de cita por WhatsApp al tutor.
 *
 * Reglas:
 *   1. Master switch `organizations.whatsapp_reminders_enabled` = true.
 *   2. Sub-toggle `whatsapp_appt_confirmation_enabled` = true.
 *   3. Cliente con `whatsapp_opt_in = true` y `phone_e164` válido.
 *   4. Kill switch global y dry-run respetados (igual que el cron).
 *
 * No bloqueante: el caller (Server Action de citas) no debe fallar si esto
 * falla. Usa service_role porque corre desde dentro de la app sin requerir
 * permisos del usuario que agendó.
 */
export async function sendApptConfirmation(
  orgId: string,
  appointmentId: string
): Promise<DispatchResult> {
  if (process.env.WHATSAPP_KILL_SWITCH === "true") {
    return { status: "noop", reason: "kill_switch_active" };
  }

  const provider = getWhatsAppProvider();
  if (!provider) {
    return { status: "noop", reason: "provider_not_configured" };
  }

  const supabase = createAdminClient();

  const { data: org } = await supabase
    .from("organizations")
    .select(
      "id, name, whatsapp_reminders_enabled, whatsapp_appt_confirmation_enabled"
    )
    .eq("id", orgId)
    .maybeSingle();

  if (!org) return { status: "noop", reason: "org_not_found" };
  if (!org.whatsapp_reminders_enabled) {
    return { status: "noop", reason: "master_switch_off" };
  }
  if (!org.whatsapp_appt_confirmation_enabled) {
    return { status: "noop", reason: "confirmation_toggle_off" };
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select(
      `
      id, date, start_time, org_id,
      pet:pets!pet_id ( id, name ),
      client:clients!client_id ( id, first_name, phone_e164, whatsapp_opt_in )
      `
    )
    .eq("id", appointmentId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!appt) return { status: "noop", reason: "appointment_not_found" };

  type Row = {
    id: string;
    date: string;
    start_time: string;
    org_id: string;
    pet: { id: string; name: string } | null;
    client: {
      id: string;
      first_name: string;
      phone_e164: string | null;
      whatsapp_opt_in: boolean;
    } | null;
  };
  const row = appt as unknown as Row;

  if (!row.client || !row.pet) {
    return { status: "noop", reason: "missing_relations" };
  }
  if (!row.client.whatsapp_opt_in || !row.client.phone_e164) {
    return { status: "noop", reason: "client_not_opted_in" };
  }

  const dateLabel = format(new Date(row.date + "T12:00:00"), "dd-MM");
  const timeLabel = row.start_time.slice(0, 5);

  // Dry-run: redirige a un número de testing. La auditoría queda en
  // notification_logs.payload (dry_run + real_to + tutor) — no contaminamos
  // el cuerpo del mensaje porque WhatsApp templates solo permiten sustituir
  // variables y el prefijo rompe el orden gramatical del template.
  const dryTo = process.env.WHATSAPP_DRY_RUN_TO?.trim();
  const realTo = row.client.phone_e164;
  const sendTo = dryTo && dryTo.length > 0 ? dryTo : realTo;

  const message = buildApptConfirmation(sendTo, {
    petName: row.pet.name,
    dateLabel,
    timeLabel,
    clinicName: org.name,
  });

  const result = await provider.sendTemplate(message);

  await supabase.from("notification_logs").insert({
    org_id: org.id,
    client_id: row.client.id,
    pet_id: row.pet.id,
    appointment_id: row.id,
    channel: "whatsapp",
    template: message.template,
    status: result.status,
    provider_message_id: result.providerMessageId ?? null,
    error_code: result.errorCode ?? null,
    error_message: result.errorMessage ?? null,
    payload: {
      tutor: row.client.first_name,
      pet: row.pet.name,
      date: dateLabel,
      time: timeLabel,
      dry_run: Boolean(dryTo && dryTo.length > 0),
      real_to: realTo,
      sent_to: sendTo,
    },
  });

  if (result.status === "failed") {
    return { status: "failed", error: result.errorMessage ?? "send_failed" };
  }

  return {
    status: result.status === "sent" ? "sent" : "queued",
    providerMessageId: result.providerMessageId,
  };
}
