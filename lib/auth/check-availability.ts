import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Validación de disponibilidad de un profesional para una cita.
//
// Tres chequeos en orden:
//   1. Dentro del horario semanal recurrente (member_weekly_schedules).
//   2. No hay bloqueo puntual que solape (member_schedule_blocks).
//   3. No hay otra cita del mismo profesional que solape en status activo.
//
// Se usa desde createAppointment/updateAppointment para rechazar citas
// inválidas con mensajes accionables.
// ============================================================================

const ACTIVE_APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
  "ready_for_pickup",
] as const;

const DAY_NAMES_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

export type AvailabilityResult =
  | { ok: true }
  | { ok: false; error: string };

interface AvailabilityArgs {
  memberId: string;
  date: string;        // ISO yyyy-MM-dd
  startTime: string;   // HH:mm or HH:mm:ss
  endTime: string;     // HH:mm or HH:mm:ss
  excludeAppointmentId?: string;
}

export async function checkMemberAvailability(
  supabase: SupabaseClient,
  args: AvailabilityArgs
): Promise<AvailabilityResult> {
  const { memberId, date, startTime, endTime } = args;

  const dayOfWeek = new Date(`${date}T12:00:00`).getDay();

  // Check 1: ¿tiene algún tramo semanal que cubra [startTime, endTime]?
  const { data: schedules, error: schedError } = await supabase
    .from("member_weekly_schedules")
    .select("start_time, end_time")
    .eq("member_id", memberId)
    .eq("day_of_week", dayOfWeek);

  if (schedError) {
    return { ok: false, error: schedError.message };
  }

  if (!schedules || schedules.length === 0) {
    return {
      ok: false,
      error: `El profesional no atiende los ${DAY_NAMES_ES[dayOfWeek]}.`,
    };
  }

  const coversFully = schedules.some((s) => {
    return s.start_time <= startTime && s.end_time >= endTime;
  });

  if (!coversFully) {
    const tramos = schedules
      .map((s) => `${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`)
      .join(", ");
    return {
      ok: false,
      error: `Fuera del horario de atención (${tramos}).`,
    };
  }

  // Check 2: ¿hay bloqueo puntual que cubra la fecha? (inclusive día completo)
  const { data: blocks, error: blockError } = await supabase
    .from("member_schedule_blocks")
    .select("start_date, end_date, reason")
    .eq("member_id", memberId)
    .lte("start_date", date)
    .gte("end_date", date);

  if (blockError) {
    return { ok: false, error: blockError.message };
  }

  if (blocks && blocks.length > 0) {
    // No exponer el motivo del bloqueo (puede ser dato personal del empleado:
    // licencia médica, duelo, etc.). Admin puede consultar el detalle desde
    // Settings > Equipo > [miembro].
    return {
      ok: false,
      error: "Profesional no disponible en esa fecha.",
    };
  }

  // Check 3: ¿hay cita solapada en status activo?
  let conflictQuery = supabase
    .from("appointments")
    .select("id, start_time, end_time")
    .eq("assigned_to", memberId)
    .eq("date", date)
    .in("status", [...ACTIVE_APPOINTMENT_STATUSES])
    .lt("start_time", endTime)
    .gt("end_time", startTime);

  if (args.excludeAppointmentId) {
    conflictQuery = conflictQuery.neq("id", args.excludeAppointmentId);
  }

  const { data: conflicts, error: conflictError } = await conflictQuery;

  if (conflictError) {
    return { ok: false, error: conflictError.message };
  }

  if (conflicts && conflicts.length > 0) {
    const other = conflicts[0];
    return {
      ok: false,
      error: `Ya tiene cita de ${other.start_time.slice(0, 5)} a ${other.end_time.slice(0, 5)}.`,
    };
  }

  return { ok: true };
}
