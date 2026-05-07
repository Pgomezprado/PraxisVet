import "server-only";

import { createAdminClient } from "@/lib/supabase/admin.server";
import { sendTemplate } from "@/lib/notifications/kapso/client";

const TEMPLATE_LANG = "es";

type DispatchResult =
  | { ok: true; messageId: string; logId: string }
  | { ok: false; reason: string; logId?: string };

/**
 * Envía la confirmación de cita por WhatsApp, validando todos los guardas:
 *   - master switch de la org (`whatsapp_reminders_enabled`)
 *   - sub-toggle (`whatsapp_appt_confirmation_enabled`)
 *   - opt-in del cliente (`whatsapp_opt_in` + `phone_e164` válido)
 *   - template configurado (`KAPSO_TPL_APPT_CONFIRMATION`)
 *
 * Inserta una fila en `notification_logs` con status='queued' antes del envío
 * y la actualiza con el resultado. Diseñada para invocarse fire-and-forget
 * desde Server Actions:
 *
 *   void sendAppointmentConfirmation(appt.id);
 *
 * Nunca lanza: cualquier error queda registrado y devuelto en el resultado
 * para que el flujo principal (crear/actualizar cita) no se rompa por una
 * falla del proveedor de mensajería.
 */
export async function sendAppointmentConfirmation(
  appointmentId: string,
): Promise<DispatchResult> {
  const templateName = process.env.KAPSO_TPL_APPT_CONFIRMATION;
  if (!templateName) {
    return { ok: false, reason: "KAPSO_TPL_APPT_CONFIRMATION no configurado" };
  }

  const supabase = createAdminClient();

  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select(
      `
      id, org_id, client_id, pet_id, date, start_time,
      client:clients!client_id (id, first_name, phone_e164, whatsapp_opt_in),
      pet:pets!pet_id (id, name),
      organization:organizations!org_id (
        id, name,
        whatsapp_reminders_enabled,
        whatsapp_appt_confirmation_enabled
      )
      `,
    )
    .eq("id", appointmentId)
    .single<{
      id: string;
      org_id: string;
      client_id: string;
      pet_id: string;
      date: string;
      start_time: string;
      client: {
        id: string;
        first_name: string;
        phone_e164: string | null;
        whatsapp_opt_in: boolean;
      } | null;
      pet: { id: string; name: string } | null;
      organization: {
        id: string;
        name: string;
        whatsapp_reminders_enabled: boolean;
        whatsapp_appt_confirmation_enabled: boolean;
      } | null;
    }>();

  if (apptErr || !appt) {
    return { ok: false, reason: `appointment not found: ${apptErr?.message ?? "n/a"}` };
  }
  if (!appt.organization?.whatsapp_reminders_enabled) {
    return { ok: false, reason: "whatsapp_reminders_enabled=false" };
  }
  if (!appt.organization.whatsapp_appt_confirmation_enabled) {
    return { ok: false, reason: "whatsapp_appt_confirmation_enabled=false" };
  }
  if (!appt.client?.whatsapp_opt_in) {
    return { ok: false, reason: "client opt-out" };
  }
  if (!appt.client.phone_e164) {
    return { ok: false, reason: "phone_e164 missing" };
  }
  if (!appt.pet) {
    return { ok: false, reason: "pet missing" };
  }

  // Variables del template. El template en Meta debe declarar exactamente
  // estos parameter_name: tutor, pet, clinic, date, time.
  const variables: Record<string, string> = {
    tutor: appt.client.first_name,
    pet: appt.pet.name,
    clinic: appt.organization.name,
    date: formatDateEsCL(appt.date),
    time: formatTime(appt.start_time),
  };

  // Pre-log con status='queued' para idempotencia y auditoría.
  const { data: logRow, error: logErr } = await supabase
    .from("notification_logs")
    .insert({
      org_id: appt.org_id,
      client_id: appt.client_id,
      pet_id: appt.pet_id,
      appointment_id: appt.id,
      channel: "whatsapp",
      provider: "kapso",
      template: templateName,
      status: "queued",
      direction: "outbound",
      phone_e164: appt.client.phone_e164,
      payload: { variables } as object,
    })
    .select("id")
    .single();

  if (logErr || !logRow) {
    return { ok: false, reason: `log insert failed: ${logErr?.message ?? "n/a"}` };
  }

  const result = await sendTemplate({
    to: appt.client.phone_e164,
    template: templateName,
    language: TEMPLATE_LANG,
    variables,
  });

  if (!result.ok) {
    await supabase
      .from("notification_logs")
      .update({
        status: "failed",
        error_message: result.error,
        updated_at: new Date().toISOString(),
      })
      .eq("id", logRow.id);
    return { ok: false, reason: result.error, logId: logRow.id };
  }

  await supabase
    .from("notification_logs")
    .update({
      status: "sent",
      provider_message_id: result.messageId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", logRow.id);

  return { ok: true, messageId: result.messageId, logId: logRow.id };
}

/**
 * Envía el recordatorio 24h antes de la cita. Mismas guardas que la
 * confirmación, pero usando `whatsapp_appt_reminder_24h_enabled` y el template
 * `KAPSO_TPL_APPT_REMINDER_24H`. Idempotente: el caller (cron) marca
 * `appointments.reminder_sent=true` al éxito para no reprocesar.
 */
export async function sendAppointmentReminder24h(
  appointmentId: string,
): Promise<DispatchResult> {
  const templateName = process.env.KAPSO_TPL_APPT_REMINDER_24H;
  if (!templateName) {
    return { ok: false, reason: "KAPSO_TPL_APPT_REMINDER_24H no configurado" };
  }

  const supabase = createAdminClient();

  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select(
      `
      id, org_id, client_id, pet_id, date, start_time, status, reminder_sent,
      client:clients!client_id (id, first_name, phone_e164, whatsapp_opt_in),
      pet:pets!pet_id (id, name),
      organization:organizations!org_id (
        id, name,
        whatsapp_reminders_enabled,
        whatsapp_appt_reminder_24h_enabled
      )
      `,
    )
    .eq("id", appointmentId)
    .single<{
      id: string;
      org_id: string;
      client_id: string;
      pet_id: string;
      date: string;
      start_time: string;
      status: string;
      reminder_sent: boolean;
      client: {
        id: string;
        first_name: string;
        phone_e164: string | null;
        whatsapp_opt_in: boolean;
      } | null;
      pet: { id: string; name: string } | null;
      organization: {
        id: string;
        name: string;
        whatsapp_reminders_enabled: boolean;
        whatsapp_appt_reminder_24h_enabled: boolean;
      } | null;
    }>();

  if (apptErr || !appt) {
    return { ok: false, reason: `appointment not found: ${apptErr?.message ?? "n/a"}` };
  }
  if (appt.reminder_sent) {
    return { ok: false, reason: "reminder already sent" };
  }
  if (appt.status !== "confirmed") {
    return { ok: false, reason: `status=${appt.status}, only confirmed` };
  }
  if (!appt.organization?.whatsapp_reminders_enabled) {
    return { ok: false, reason: "whatsapp_reminders_enabled=false" };
  }
  if (!appt.organization.whatsapp_appt_reminder_24h_enabled) {
    return { ok: false, reason: "whatsapp_appt_reminder_24h_enabled=false" };
  }
  if (!appt.client?.whatsapp_opt_in) {
    return { ok: false, reason: "client opt-out" };
  }
  if (!appt.client.phone_e164) {
    return { ok: false, reason: "phone_e164 missing" };
  }
  if (!appt.pet) {
    return { ok: false, reason: "pet missing" };
  }

  const variables: Record<string, string> = {
    tutor: appt.client.first_name,
    pet: appt.pet.name,
    clinic: appt.organization.name,
    date: formatDateEsCL(appt.date),
    time: formatTime(appt.start_time),
  };

  const { data: logRow, error: logErr } = await supabase
    .from("notification_logs")
    .insert({
      org_id: appt.org_id,
      client_id: appt.client_id,
      pet_id: appt.pet_id,
      appointment_id: appt.id,
      channel: "whatsapp",
      provider: "kapso",
      template: templateName,
      status: "queued",
      direction: "outbound",
      phone_e164: appt.client.phone_e164,
      payload: { variables } as object,
    })
    .select("id")
    .single();

  if (logErr || !logRow) {
    return { ok: false, reason: `log insert failed: ${logErr?.message ?? "n/a"}` };
  }

  const result = await sendTemplate({
    to: appt.client.phone_e164,
    template: templateName,
    language: TEMPLATE_LANG,
    variables,
  });

  if (!result.ok) {
    await supabase
      .from("notification_logs")
      .update({
        status: "failed",
        error_message: result.error,
        updated_at: new Date().toISOString(),
      })
      .eq("id", logRow.id);
    return { ok: false, reason: result.error, logId: logRow.id };
  }

  await supabase
    .from("notification_logs")
    .update({
      status: "sent",
      provider_message_id: result.messageId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", logRow.id);

  // Marca idempotencia: el cron no volverá a procesar esta cita.
  await supabase
    .from("appointments")
    .update({ reminder_sent: true })
    .eq("id", appt.id);

  return { ok: true, messageId: result.messageId, logId: logRow.id };
}

/**
 * Envía recordatorio de vacuna próxima a vencer. La fuente de verdad es
 * `reminders` (alimentada por triggers cuando se crea/actualiza una
 * vacunación). Idempotente: marca `reminders.status='sent'` al éxito para
 * no reprocesar en corridas siguientes del cron.
 */
export async function sendVaccineReminder(
  reminderId: string,
): Promise<DispatchResult> {
  const templateName = process.env.KAPSO_TPL_VACCINE_REMINDER;
  if (!templateName) {
    return { ok: false, reason: "KAPSO_TPL_VACCINE_REMINDER no configurado" };
  }

  const supabase = createAdminClient();

  // El reminder vincula a pet + due_date + source (vaccination.id). Cargamos
  // la cadena pet → client + org en una sola query.
  const { data: reminder, error: reminderErr } = await supabase
    .from("reminders")
    .select(
      `
      id, org_id, pet_id, type, status, due_date, source_table, source_id,
      pet:pets!pet_id (
        id, name,
        client:clients!client_id (
          id, first_name, phone_e164, whatsapp_opt_in
        )
      ),
      organization:organizations!org_id (
        id, name,
        whatsapp_reminders_enabled,
        whatsapp_vaccine_reminder_enabled
      )
      `,
    )
    .eq("id", reminderId)
    .single<{
      id: string;
      org_id: string;
      pet_id: string;
      type: string;
      status: string;
      due_date: string;
      source_table: string | null;
      source_id: string | null;
      pet: {
        id: string;
        name: string;
        client: {
          id: string;
          first_name: string;
          phone_e164: string | null;
          whatsapp_opt_in: boolean;
        } | null;
      } | null;
      organization: {
        id: string;
        name: string;
        whatsapp_reminders_enabled: boolean;
        whatsapp_vaccine_reminder_enabled: boolean;
      } | null;
    }>();

  if (reminderErr || !reminder) {
    return { ok: false, reason: `reminder not found: ${reminderErr?.message ?? "n/a"}` };
  }
  if (reminder.type !== "vaccination") {
    return { ok: false, reason: `type=${reminder.type}, only vaccination` };
  }
  if (reminder.status !== "pending") {
    return { ok: false, reason: `status=${reminder.status}, only pending` };
  }
  if (!reminder.organization?.whatsapp_reminders_enabled) {
    return { ok: false, reason: "whatsapp_reminders_enabled=false" };
  }
  if (!reminder.organization.whatsapp_vaccine_reminder_enabled) {
    return { ok: false, reason: "whatsapp_vaccine_reminder_enabled=false" };
  }
  if (!reminder.pet?.client?.whatsapp_opt_in) {
    return { ok: false, reason: "client opt-out" };
  }
  if (!reminder.pet.client.phone_e164) {
    return { ok: false, reason: "phone_e164 missing" };
  }

  // Lookup del nombre de la vacuna desde la fila origen.
  let vaccineName = "vacuna anual";
  if (reminder.source_table === "vaccinations" && reminder.source_id) {
    const { data: vacc } = await supabase
      .from("vaccinations")
      .select("vaccine_name")
      .eq("id", reminder.source_id)
      .maybeSingle();
    if (vacc?.vaccine_name) vaccineName = vacc.vaccine_name;
  }

  const variables: Record<string, string> = {
    tutor: reminder.pet.client.first_name,
    pet: reminder.pet.name,
    vaccine: vaccineName,
    due_date: formatDateEsCL(reminder.due_date),
    clinic: reminder.organization.name,
  };

  const { data: logRow, error: logErr } = await supabase
    .from("notification_logs")
    .insert({
      org_id: reminder.org_id,
      client_id: reminder.pet.client.id,
      pet_id: reminder.pet_id,
      channel: "whatsapp",
      provider: "kapso",
      template: templateName,
      status: "queued",
      direction: "outbound",
      phone_e164: reminder.pet.client.phone_e164,
      payload: { variables, reminder_id: reminder.id } as object,
    })
    .select("id")
    .single();

  if (logErr || !logRow) {
    return { ok: false, reason: `log insert failed: ${logErr?.message ?? "n/a"}` };
  }

  const result = await sendTemplate({
    to: reminder.pet.client.phone_e164,
    template: templateName,
    language: TEMPLATE_LANG,
    variables,
  });

  if (!result.ok) {
    await supabase
      .from("notification_logs")
      .update({
        status: "failed",
        error_message: result.error,
        updated_at: new Date().toISOString(),
      })
      .eq("id", logRow.id);
    return { ok: false, reason: result.error, logId: logRow.id };
  }

  await supabase
    .from("notification_logs")
    .update({
      status: "sent",
      provider_message_id: result.messageId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", logRow.id);

  // Idempotencia: marca el reminder como enviado para que el cron no
  // vuelva a procesarlo. La transición a 'done' la hará el equipo cuando
  // la mascota efectivamente reciba la dosis (revacunación).
  await supabase
    .from("reminders")
    .update({ status: "sent" })
    .eq("id", reminder.id);

  return { ok: true, messageId: result.messageId, logId: logRow.id };
}

function formatDateEsCL(iso: string): string {
  // iso = "yyyy-MM-dd"
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

function formatTime(t: string): string {
  // start_time = "HH:mm:ss" o "HH:mm"
  return t.slice(0, 5);
}
