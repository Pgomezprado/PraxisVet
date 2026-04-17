import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/types";

export interface CurrentMember {
  id: string;
  org_id: string;
  role: MemberRole;
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
    .select("id, org_id, role, organizations!inner(slug)")
    .eq("user_id", user.id)
    .eq("active", true)
    .eq("organizations.slug", clinicSlug)
    .single();

  if (!data) return null;
  return {
    id: data.id,
    org_id: data.org_id,
    role: data.role as MemberRole,
  };
}

export function canViewClinical(role: MemberRole): boolean {
  return role === "admin" || role === "vet";
}
