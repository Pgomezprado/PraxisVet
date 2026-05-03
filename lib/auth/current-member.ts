import { createClient } from "@/lib/supabase/server";
import type { MemberCapability, MemberRole } from "@/types";

export interface CurrentMember {
  id: string;
  org_id: string;
  role: MemberRole;
  // Capabilities EXTRAS configuradas en member_capabilities. Permiten doble
  // rol — ej: una vet con can_groom puede acceder a peluquería completa.
  capabilities: MemberCapability[];
}

/**
 * Devuelve el membership del usuario autenticado en una clínica por slug.
 * Útil para ocultar UI por rol en Server Components (RLS sigue siendo la barrera real).
 */
export async function getCurrentMember(
  clinicSlug: string
): Promise<CurrentMember | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("organization_members")
    .select(
      `id, org_id, role,
       organizations!inner(slug),
       member_capabilities(capability)`
    )
    .eq("user_id", user.id)
    .eq("active", true)
    .eq("organizations.slug", clinicSlug)
    .single();

  if (!data) return null;
  const capRows = (data.member_capabilities ?? []) as Array<{
    capability: MemberCapability;
  }>;
  return {
    id: data.id,
    org_id: data.org_id,
    role: data.role as MemberRole,
    capabilities: capRows.map((r) => r.capability),
  };
}

// Helpers que evalúan permisos a partir del rol base + capabilities extras.
// Aceptan el member completo (no solo el role) porque la decisión 2026-05-03
// permite que capabilities abran acceso a datos clínicos/peluquería.

type MemberLike = Pick<CurrentMember, "role" | "capabilities">;

export function canViewClinical(member: MemberLike): boolean {
  if (member.role === "admin" || member.role === "vet") return true;
  return member.capabilities.includes("can_vet");
}

export function canViewGrooming(member: MemberLike): boolean {
  if (member.role === "admin" || member.role === "groomer") return true;
  return member.capabilities.includes("can_groom");
}

/**
 * Quién puede registrar peluquería *histórica* desde la ficha del cliente.
 * Cubre: cualquiera que ya pueda ver peluquería + el recepcionista (excepción
 * onboarding: puede crear pero NO ver/editar — la RLS lo enforza).
 */
export function canCreateGroomingHistorical(member: MemberLike): boolean {
  return canViewGrooming(member) || member.role === "receptionist";
}

/**
 * Quién puede ver/listar exámenes de una mascota.
 * Recepcionista necesita acceso porque sube resultados que llegan del laboratorio.
 * Peluquero NO ve exámenes (mismo criterio que ficha clínica).
 */
export function canViewExams(role: MemberRole): boolean {
  return role === "admin" || role === "vet" || role === "receptionist";
}

/**
 * Quién puede escribir/editar la interpretación clínica de un examen.
 * Solo veterinarios y admin. La recepcionista puede subir el archivo,
 * pero no interpretar el resultado.
 */
export function canInterpretExam(role: MemberRole): boolean {
  return role === "admin" || role === "vet";
}
