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
 * Lista miembros activos de la org que pueden ejercer la capability dada,
 * combinando rol base + member_capabilities. Usado por los formularios de
 * registro (peluquería, ficha clínica, vacunas, desparasitaciones) para
 * que un vet con can_groom — o un groomer con can_vet — aparezca en el
 * dropdown correspondiente.
 *
 * Ordena por first_name por defecto; pasar `orderBy: 'last_name'` para
 * cambiarlo (matchea el orden previo de algunos screens).
 */
export async function listMembersWithCapability(
  supabase: SupabaseClient,
  orgId: string,
  capability: Capability,
  orderBy: "first_name" | "last_name" = "first_name"
): Promise<
  Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    specialty: string | null;
  }>
> {
  const coveringRoles = ROLE_COVERS_CAPABILITY[capability];

  const { data: base, error: baseError } = await supabase
    .from("organization_members")
    .select("id, first_name, last_name, specialty")
    .eq("org_id", orgId)
    .eq("active", true)
    .in("role", coveringRoles as string[]);

  if (baseError) throw baseError;

  // Roles fuera del rol base que tengan la capability explícita
  // (ej: vet con can_groom, groomer con can_vet, recepcionista con can_*).
  const { data: extra, error: extraError } = await supabase
    .from("organization_members")
    .select(
      `id, first_name, last_name, specialty,
       member_capabilities!inner (capability)`
    )
    .eq("org_id", orgId)
    .eq("active", true)
    .eq("member_capabilities.capability", capability)
    .not("role", "in", `(${coveringRoles.join(",")})`);

  if (extraError) throw extraError;

  const baseIds = new Set((base ?? []).map((m) => m.id as string));
  const merged = [
    ...((base ?? []) as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      specialty: string | null;
    }>),
    ...((extra ?? []) as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      specialty: string | null;
      member_capabilities: unknown;
    }>)
      .filter((m) => !baseIds.has(m.id))
      .map((m) => ({
        id: m.id,
        first_name: m.first_name,
        last_name: m.last_name,
        specialty: m.specialty,
      })),
  ];

  merged.sort((a, b) => {
    const av = (orderBy === "last_name" ? a.last_name : a.first_name) ?? "";
    const bv = (orderBy === "last_name" ? b.last_name : b.first_name) ?? "";
    return av.localeCompare(bv);
  });

  return merged;
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
