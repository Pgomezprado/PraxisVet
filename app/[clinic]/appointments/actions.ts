"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  appointmentSchema,
  depositSchema,
  updateStatusSchema,
} from "@/lib/validations/appointments";
import type {
  AppointmentInput,
  DepositInput,
} from "@/lib/validations/appointments";
import type {
  AppointmentStatus,
  AppointmentType,
  MemberRole,
  ServiceCategory,
} from "@/types";
import { validateMemberInOrg } from "@/lib/auth/validate-member";
import {
  canAssignMemberToAppointment,
  filterMembersByCapability,
  capabilityForAppointmentType,
} from "@/lib/auth/capabilities";
import { checkMemberAvailability } from "@/lib/auth/check-availability";
import { canManageAppointmentDeposit } from "@/lib/auth/current-member";

export type AppointmentWithRelations = {
  id: string;
  org_id: string;
  pet_id: string;
  client_id: string;
  assigned_to: string;
  service_id: string | null;
  type: AppointmentType;
  status: AppointmentStatus;
  date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  notes: string | null;
  is_dangerous: boolean;
  reminder_sent: boolean;
  deposit_amount: number | null;
  deposit_paid_at: string | null;
  deposit_collected_by: string | null;
  deposit_method: "cash" | "payment_link" | "transfer" | null;
  deposit_reference: string | null;
  created_at: string;
  client: { id: string; first_name: string; last_name: string; phone: string | null };
  pet: { id: string; name: string; species: string | null; breed: string | null };
  professional: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    specialty: string | null;
    role: MemberRole;
  };
  service: {
    id: string;
    name: string;
    duration_minutes: number;
    price: number | null;
    category: ServiceCategory | null;
  } | null;
  /** ID de la ficha clínica asociada a la cita médica, si existe.
   *  Permite saltar a `/records/{id}` en lugar de crear una nueva. */
  linked_clinical_record_id: string | null;
  /** ID del registro de peluquería asociado a la cita grooming, si existe. */
  linked_grooming_record_id: string | null;
};

// PostgREST infiere el reverse-embed por el nombre de la tabla hija + la FK.
// `clinical_records.appointment_id` y `grooming_records.appointment_id` son
// los únicos FKs hacia appointments en cada tabla, así que el alias por
// columna es suficiente y el join se acota con LIMIT 1.
const SELECT_WITH_RELATIONS = `
      *,
      client:clients!client_id (id, first_name, last_name, phone),
      pet:pets!pet_id (id, name, species, breed),
      professional:organization_members!assigned_to (id, first_name, last_name, specialty, role),
      service:services!service_id (id, name, duration_minutes, price, category),
      clinical_records!appointment_id (id),
      grooming_records!appointment_id (id)
    `;

type RawAppointmentRow = Omit<
  AppointmentWithRelations,
  "linked_clinical_record_id" | "linked_grooming_record_id"
> & {
  clinical_records: { id: string }[] | null;
  grooming_records: { id: string }[] | null;
};

function shapeAppointmentWithRelations(
  raw: RawAppointmentRow
): AppointmentWithRelations {
  const clinicalLinked = raw.clinical_records?.[0]?.id ?? null;
  const groomingLinked = raw.grooming_records?.[0]?.id ?? null;
  // Removemos las arrays crudas para dejar el shape plano que consume la UI.
  const {
    clinical_records: _cr,
    grooming_records: _gr,
    ...rest
  } = raw;
  void _cr;
  void _gr;
  return {
    ...rest,
    linked_clinical_record_id: clinicalLinked,
    linked_grooming_record_id: groomingLinked,
  };
}

export async function getAppointments(
  orgId: string,
  date?: string,
  opts: { assignedTo?: string } = {}
) {
  const supabase = await createClient();

  let query = supabase
    .from("appointments")
    .select(SELECT_WITH_RELATIONS)
    .eq("org_id", orgId)
    .order("start_time", { ascending: true });

  if (date) {
    query = query.eq("date", date);
  }
  if (opts.assignedTo) {
    query = query.eq("assigned_to", opts.assignedTo);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  const shaped = (data ?? []).map((row) =>
    shapeAppointmentWithRelations(row as unknown as RawAppointmentRow)
  );
  return { data: shaped, error: null };
}

export async function getAppointment(appointmentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      *,
      client:clients!client_id (id, first_name, last_name, phone, email),
      pet:pets!pet_id (id, name, species, breed, sex, birthdate),
      professional:organization_members!assigned_to (id, first_name, last_name, specialty, role),
      service:services!service_id (id, name, duration_minutes, price, category),
      clinical_records!appointment_id (id),
      grooming_records!appointment_id (id)
    `
    )
    .eq("id", appointmentId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: shapeAppointmentWithRelations(data as unknown as RawAppointmentRow),
    error: null,
  };
}

export async function createAppointment(orgId: string, formData: AppointmentInput) {
  const parsed = appointmentSchema.safeParse(formData);

  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message };
  }

  // No se permiten citas en el pasado. Backfill debe ir por script/SQL, no UI.
  // Usamos TZ Chile (no UTC) para que el corte de día coincida con la realidad
  // del usuario: sin esto, entre las 20:00 y 23:59 Chile el sistema piensa
  // que ya es "mañana" y rechaza citas válidas del mismo día.
  // Intl.DateTimeFormat con locale "sv-SE" produce formato yyyy-MM-dd nativo.
  const todayIso = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Santiago",
  }).format(new Date());
  if (parsed.data.date < todayIso) {
    return {
      data: null,
      error: "No se pueden agendar citas en fechas pasadas.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "No autenticado" };
  }

  const memberCheck = await validateMemberInOrg(
    supabase,
    parsed.data.assigned_to,
    orgId
  );
  if (!memberCheck.ok) {
    return { data: null, error: memberCheck.error };
  }

  const canAssign = await canAssignMemberToAppointment(
    supabase,
    parsed.data.assigned_to,
    parsed.data.type
  );
  if (!canAssign) {
    return {
      data: null,
      error:
        parsed.data.type === "medical"
          ? "Este profesional no puede atender consultas médicas."
          : "Este profesional no puede atender peluquería.",
    };
  }

  const availability = await checkMemberAvailability(supabase, {
    memberId: parsed.data.assigned_to,
    date: parsed.data.date,
    startTime: parsed.data.start_time,
    endTime: parsed.data.end_time,
  });
  if (!availability.ok) {
    return { data: null, error: availability.error };
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      org_id: orgId,
      client_id: parsed.data.client_id,
      pet_id: parsed.data.pet_id,
      assigned_to: parsed.data.assigned_to,
      type: parsed.data.type,
      service_id: parsed.data.service_id || null,
      date: parsed.data.date,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      reason: parsed.data.reason || null,
      notes: parsed.data.notes || null,
      is_dangerous: parsed.data.is_dangerous,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23P01") {
      return {
        data: null,
        error: "Ya existe una cita solapada para este profesional en ese horario.",
      };
    }
    return { data: null, error: error.message };
  }

  revalidatePath(`/[clinic]/appointments`, "page");
  return { data, error: null };
}

export async function updateAppointment(appointmentId: string, formData: AppointmentInput) {
  const parsed = appointmentSchema.safeParse(formData);

  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "No autenticado" };
  }

  const { data: existing } = await supabase
    .from("appointments")
    .select("org_id")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!existing) {
    return { data: null, error: "Cita no encontrada" };
  }

  const memberCheck = await validateMemberInOrg(
    supabase,
    parsed.data.assigned_to,
    existing.org_id
  );
  if (!memberCheck.ok) {
    return { data: null, error: memberCheck.error };
  }

  const canAssign = await canAssignMemberToAppointment(
    supabase,
    parsed.data.assigned_to,
    parsed.data.type
  );
  if (!canAssign) {
    return {
      data: null,
      error:
        parsed.data.type === "medical"
          ? "Este profesional no puede atender consultas médicas."
          : "Este profesional no puede atender peluquería.",
    };
  }

  const availability = await checkMemberAvailability(supabase, {
    memberId: parsed.data.assigned_to,
    date: parsed.data.date,
    startTime: parsed.data.start_time,
    endTime: parsed.data.end_time,
    excludeAppointmentId: appointmentId,
  });
  if (!availability.ok) {
    return { data: null, error: availability.error };
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({
      client_id: parsed.data.client_id,
      pet_id: parsed.data.pet_id,
      assigned_to: parsed.data.assigned_to,
      type: parsed.data.type,
      service_id: parsed.data.service_id || null,
      date: parsed.data.date,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      reason: parsed.data.reason || null,
      notes: parsed.data.notes || null,
      is_dangerous: parsed.data.is_dangerous,
    })
    .eq("id", appointmentId)
    .select()
    .single();

  if (error) {
    if (error.code === "23P01") {
      return {
        data: null,
        error: "Ya existe una cita solapada para este profesional en ese horario.",
      };
    }
    return { data: null, error: error.message };
  }

  revalidatePath(`/[clinic]/appointments`, "page");
  revalidatePath(`/[clinic]/appointments/${appointmentId}`, "page");
  return { data, error: null };
}

export async function updateAppointmentStatus(appointmentId: string, status: AppointmentStatus) {
  const parsed = updateStatusSchema.safeParse({ status });

  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "No autenticado" };
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({ status: parsed.data.status })
    .eq("id", appointmentId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath(`/[clinic]/appointments`, "page");
  revalidatePath(`/[clinic]/appointments/${appointmentId}`, "page");
  return { data, error: null };
}

export async function deleteAppointment(appointmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado" };
  }

  const { data, error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId)
    .select("id");

  if (error) {
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return {
      error:
        "No se pudo eliminar la cita. Es posible que ya haya sido eliminada o que tu rol no tenga permisos para eliminarla.",
    };
  }

  revalidatePath(`/[clinic]/appointments`, "page");
  return { error: null };
}

export async function getWeekAppointments(
  orgId: string,
  weekStartDate: string,
  opts: { assignedTo?: string } = {}
) {
  const supabase = await createClient();

  const startDate = new Date(weekStartDate + "T12:00:00");
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const endDateStr = endDate.toISOString().split("T")[0];

  let query = supabase
    .from("appointments")
    .select(SELECT_WITH_RELATIONS)
    .eq("org_id", orgId)
    .gte("date", weekStartDate)
    .lte("date", endDateStr)
    .order("start_time", { ascending: true });

  if (opts.assignedTo) {
    query = query.eq("assigned_to", opts.assignedTo);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  const shaped = (data ?? []).map((row) =>
    shapeAppointmentWithRelations(row as unknown as RawAppointmentRow)
  );
  return { data: shaped, error: null };
}

export async function checkConflicts(
  orgId: string,
  data: {
    assigned_to: string;
    date: string;
    start_time: string;
    end_time: string;
    exclude_id?: string;
  }
) {
  const supabase = await createClient();

  // Citas 'completed' no se cuentan como conflicto: el slot ya se atendió
  // y queda libre para reusarse (ver migración 20260504000001).
  let query = supabase
    .from("appointments")
    .select(SELECT_WITH_RELATIONS)
    .eq("org_id", orgId)
    .eq("assigned_to", data.assigned_to)
    .eq("date", data.date)
    .lt("start_time", data.end_time)
    .gt("end_time", data.start_time)
    .not("status", "in", '("cancelled","no_show","completed")');

  if (data.exclude_id) {
    query = query.neq("id", data.exclude_id);
  }

  const { data: conflicts, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  const shaped = (conflicts ?? []).map((row) =>
    shapeAppointmentWithRelations(row as unknown as RawAppointmentRow)
  );
  return { data: shaped, error: null };
}

export async function getMemberDayAvailability(
  memberId: string,
  date: string
): Promise<{
  tramos: { start_time: string; end_time: string }[];
  blocks: { start_date: string; end_date: string; reason: string | null }[];
}> {
  const supabase = await createClient();

  // Guard cross-tenant explícito. RLS ya filtra, pero sin este check podría
  // inferirse existencia del memberId por el tiempo de respuesta.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { tramos: [], blocks: [] };
  }

  const { data: caller } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (!caller) {
    return { tramos: [], blocks: [] };
  }

  const { data: target } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("id", memberId)
    .maybeSingle();
  if (!target || target.org_id !== caller.org_id) {
    return { tramos: [], blocks: [] };
  }

  const dayOfWeek = new Date(`${date}T12:00:00`).getDay();

  const [tramosRes, blocksRes] = await Promise.all([
    supabase
      .from("member_weekly_schedules")
      .select("start_time, end_time")
      .eq("member_id", memberId)
      .eq("day_of_week", dayOfWeek)
      .order("start_time", { ascending: true }),
    supabase
      .from("member_schedule_blocks")
      .select("start_date, end_date, reason")
      .eq("member_id", memberId)
      .lte("start_date", date)
      .gte("end_date", date),
  ]);

  return {
    tramos: tramosRes.data ?? [],
    blocks: blocksRes.data ?? [],
  };
}

export async function getMemberWeeklySchedule(
  memberId: string
): Promise<{ day_of_week: number; start_time: string; end_time: string }[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: caller } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (!caller) return [];

  const { data: target } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("id", memberId)
    .maybeSingle();
  if (!target || target.org_id !== caller.org_id) return [];

  const { data } = await supabase
    .from("member_weekly_schedules")
    .select("day_of_week, start_time, end_time")
    .eq("member_id", memberId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  return data ?? [];
}

export async function getProfessionalDayAppointments(
  orgId: string,
  professionalId: string,
  date: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id, start_time, end_time, status, type,
      pet:pets!pet_id (id, name)
    `
    )
    .eq("org_id", orgId)
    .eq("assigned_to", professionalId)
    .eq("date", date)
    // Excluimos 'completed' además de canceladas: el formulario muestra
    // esta lista como "qué slots están tomados"; una cita ya atendida
    // libera el horario y no debe sumar ruido visual.
    .not("status", "in", '("cancelled","no_show","completed")')
    .order("start_time", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getProfessionals(
  orgId: string,
  appointmentType?: AppointmentType
) {
  const supabase = await createClient();

  // Base: admin, vet, groomer activos. Son los roles que HOY atienden
  // por rol base. Miembros con role receptionist pero con capability
  // can_vet/can_groom se suman abajo.
  const { data: baseMembers, error: baseError } = await supabase
    .from("organization_members")
    .select("id, first_name, last_name, specialty, role")
    .eq("org_id", orgId)
    .eq("active", true)
    .in("role", ["admin", "vet", "groomer"])
    .order("first_name");

  if (baseError) {
    return { data: null, error: baseError.message };
  }

  // Incluir también miembros con capabilities explícitas (ej: recepcionista
  // con can_groom, o cualquier combinación post-multi-rol).
  const { data: extraMembers, error: extraError } = await supabase
    .from("organization_members")
    .select(
      `id, first_name, last_name, specialty, role,
       member_capabilities!inner (capability)`
    )
    .eq("org_id", orgId)
    .eq("active", true)
    .not("role", "in", "(admin,vet,groomer)");

  if (extraError) {
    return { data: null, error: extraError.message };
  }

  const baseIds = new Set((baseMembers ?? []).map((m) => m.id));
  const merged = [
    ...(baseMembers ?? []),
    ...(extraMembers ?? [])
      .filter((m) => !baseIds.has(m.id))
      .map(({ member_capabilities: _omit, ...rest }) => rest),
  ];

  // Cargamos las capabilities explícitas de TODOS los miembros incluidos —
  // así el cliente puede filtrar sincrónicamente al cambiar el tipo de cita
  // sin esperar otra round-trip ni mostrar listas estaladas.
  const { data: caps, error: capsError } = await supabase
    .from("member_capabilities")
    .select("member_id, capability")
    .eq("org_id", orgId)
    .in("member_id", merged.map((m) => m.id));

  if (capsError) {
    return { data: null, error: capsError.message };
  }

  const capsByMember = new Map<string, string[]>();
  for (const row of caps ?? []) {
    const id = row.member_id as string;
    const cap = row.capability as string;
    const list = capsByMember.get(id) ?? [];
    list.push(cap);
    capsByMember.set(id, list);
  }

  // Cargamos los días de la semana en los que cada miembro atiende — así el
  // formulario puede ocultar profesionales que no trabajan el día elegido sin
  // round-trips por cada selección de fecha.
  const { data: schedules, error: schedulesError } = await supabase
    .from("member_weekly_schedules")
    .select("member_id, day_of_week")
    .in("member_id", merged.map((m) => m.id));

  if (schedulesError) {
    return { data: null, error: schedulesError.message };
  }

  const workingDaysByMember = new Map<string, number[]>();
  for (const row of schedules ?? []) {
    const id = row.member_id as string;
    const dow = row.day_of_week as number;
    const list = workingDaysByMember.get(id) ?? [];
    if (!list.includes(dow)) list.push(dow);
    workingDaysByMember.set(id, list);
  }

  const mergedWithCaps = merged.map((m) => ({
    ...m,
    capabilities: capsByMember.get(m.id) ?? [],
    working_days: workingDaysByMember.get(m.id) ?? [],
  }));

  if (!appointmentType) {
    return { data: mergedWithCaps, error: null };
  }

  // Filtrar por capability específica del tipo de cita.
  const allowedIds = await filterMembersByCapability(
    supabase,
    mergedWithCaps.map((m) => m.id),
    capabilityForAppointmentType(appointmentType)
  );
  const allowedSet = new Set(allowedIds);
  return {
    data: mergedWithCaps.filter((m) => allowedSet.has(m.id)),
    error: null,
  };
}

export async function getClientsWithPets(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select(
      `
      id, first_name, last_name, phone,
      pets (id, name, species, breed, active, is_dangerous)
    `
    )
    .eq("org_id", orgId)
    .order("first_name");

  if (error) {
    return { data: null, error: error.message };
  }

  const clientsWithActivePets = (data ?? []).map((client) => ({
    ...client,
    pets: (client.pets ?? []).filter((pet: { active: boolean }) => pet.active),
  }));

  return { data: clientsWithActivePets, error: null };
}

export async function getServices(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price, category")
    .eq("org_id", orgId)
    .eq("active", true)
    .order("name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// Abono al confirmar cita de peluquería: monto LIBRE que define recepción
// al reservar la hora. Se descuenta del total cuando se cobra el servicio
// (ver app/[clinic]/billing/new/page.tsx — pre-carga este monto como payment
// inicial al crear la factura ligada a la cita).
export async function recordAppointmentDeposit(
  appointmentId: string,
  input: DepositInput
) {
  const parsed = depositSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Datos inválidos.";
    return { error: firstIssue };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: appt, error: fetchError } = await supabase
    .from("appointments")
    .select("id, org_id, type")
    .eq("id", appointmentId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!appt) return { error: "Cita no encontrada." };
  if (appt.type !== "grooming") {
    return { error: "Solo las citas de peluquería pueden registrar abono." };
  }

  const { data: member } = await supabase
    .from("organization_members")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("org_id", appt.org_id)
    .eq("active", true)
    .maybeSingle();
  if (!member) return { error: "No perteneces a esta clínica." };
  if (!canManageAppointmentDeposit(member.role as MemberRole)) {
    return { error: "Solo recepción o admin pueden registrar abonos." };
  }

  const reference = parsed.data.reference?.trim();

  // Mutación con .select() para detectar 0 filas (RLS silenciosa).
  const { data: updated, error: updateError } = await supabase
    .from("appointments")
    .update({
      deposit_amount: parsed.data.amount,
      deposit_paid_at: new Date().toISOString(),
      deposit_collected_by: member.id,
      deposit_method: parsed.data.method,
      deposit_reference: reference && reference.length > 0 ? reference : null,
    })
    .eq("id", appointmentId)
    .select("id");
  if (updateError) return { error: updateError.message };
  if (!updated || updated.length === 0) {
    return { error: "No se pudo registrar el abono. Verifica permisos." };
  }

  revalidatePath(`/[clinic]/appointments`, "page");
  revalidatePath(`/[clinic]/appointments/${appointmentId}`, "page");
  return { error: null };
}

export async function clearAppointmentDeposit(appointmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, org_id")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt) return { error: "Cita no encontrada." };

  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", appt.org_id)
    .eq("active", true)
    .maybeSingle();
  if (!member) return { error: "No perteneces a esta clínica." };
  if (!canManageAppointmentDeposit(member.role as MemberRole)) {
    return { error: "Solo recepción o admin pueden anular abonos." };
  }

  const { data: updated, error } = await supabase
    .from("appointments")
    .update({
      deposit_amount: null,
      deposit_paid_at: null,
      deposit_collected_by: null,
      deposit_method: null,
      deposit_reference: null,
    })
    .eq("id", appointmentId)
    .select("id");
  if (error) return { error: error.message };
  if (!updated || updated.length === 0) {
    return { error: "No se pudo anular el abono. Verifica permisos." };
  }

  revalidatePath(`/[clinic]/appointments`, "page");
  revalidatePath(`/[clinic]/appointments/${appointmentId}`, "page");
  return { error: null };
}
