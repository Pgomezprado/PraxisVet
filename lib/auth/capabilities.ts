import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Capabilities — Multi-rol vía Opción A
// ============================================================================
// Un miembro de la clínica puede ejecutar una acción "can_X" si:
//   1. Su `role` principal ya la autoriza (ej: role='vet' implica can_vet), o
//   2. Tiene una fila en `member_capabilities` con esa capability.
//
// ADVERTENCIA CI-160: Este módulo solo decide *agendamiento*. NO escribir
// RLS nueva basada en capabilities sin revisión explícita. La separación
// médico/peluquería en clinical_records / grooming_records sigue basándose
// en `role` hasta que se decida otra cosa. Un groomer con can_vet NO debe
// leer clinical_records hasta que se agregue policy explícita.
// ============================================================================

export type Capability = "can_vet" | "can_groom";

export type AppointmentType = "medical" | "grooming";

/**
 * Devuelve los roles que cubren implícitamente cada capability.
 * admin siempre cubre todo (es el rol "puedo hacer cualquier cosa").
 */
const ROLE_COVERS_CAPABILITY: Record<Capability, readonly string[]> = {
  can_vet: ["admin", "vet"],
  can_groom: ["admin", "groomer"],
};

export function capabilityForAppointmentType(
  type: AppointmentType
): Capability {
  return type === "medical" ? "can_vet" : "can_groom";
}

/**
 * Verifica si un miembro tiene una capability, considerando su role base
 * y las capabilities extra registradas.
 */
export async function memberHasCapability(
  supabase: SupabaseClient,
  memberId: string,
  capability: Capability
): Promise<boolean> {
  // 1. Revisar si el role base ya cubre la capability.
  const { data: member } = await supabase
    .from("organization_members")
    .select("role, active")
    .eq("id", memberId)
    .maybeSingle();

  if (!member || !member.active) return false;

  if (ROLE_COVERS_CAPABILITY[capability].includes(member.role as string)) {
    return true;
  }

  // 2. Revisar si tiene la capability explícita.
  const { data: cap } = await supabase
    .from("member_capabilities")
    .select("capability")
    .eq("member_id", memberId)
    .eq("capability", capability)
    .maybeSingle();

  return cap != null;
}

/**
 * Devuelve true si el miembro puede ser asignado a una cita de este tipo.
 * Usado por createAppointment/updateAppointment para validar `assigned_to`.
 */
export async function canAssignMemberToAppointment(
  supabase: SupabaseClient,
  memberId: string,
  appointmentType: AppointmentType
): Promise<boolean> {
  return memberHasCapability(
    supabase,
    memberId,
    capabilityForAppointmentType(appointmentType)
  );
}

/**
 * Filtra una lista de IDs de miembros, devolviendo solo los que tienen
 * la capability para atender el tipo de cita indicado.
 * Eficiente para listar profesionales en UI de nueva cita.
 */
export async function filterMembersByCapability(
  supabase: SupabaseClient,
  memberIds: string[],
  capability: Capability
): Promise<string[]> {
  if (memberIds.length === 0) return [];

  const coveringRoles = ROLE_COVERS_CAPABILITY[capability];

  const { data: membersByRole } = await supabase
    .from("organization_members")
    .select("id, role")
    .in("id", memberIds)
    .eq("active", true);

  const coveredByRole = new Set(
    (membersByRole ?? [])
      .filter((m) => coveringRoles.includes(m.role as string))
      .map((m) => m.id)
  );

  const remaining = memberIds.filter((id) => !coveredByRole.has(id));
  if (remaining.length === 0) {
    return Array.from(coveredByRole);
  }

  const { data: explicit } = await supabase
    .from("member_capabilities")
    .select("member_id")
    .in("member_id", remaining)
    .eq("capability", capability);

  const coveredByCapability = new Set(
    (explicit ?? []).map((r) => r.member_id as string)
  );

  return memberIds.filter(
    (id) => coveredByRole.has(id) || coveredByCapability.has(id)
  );
}
