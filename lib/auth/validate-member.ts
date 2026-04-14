import type { SupabaseClient } from "@supabase/supabase-js";

export async function validateMemberInOrg(
  supabase: SupabaseClient,
  memberId: string,
  orgId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("id")
    .eq("id", memberId)
    .eq("org_id", orgId)
    .eq("active", true)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Profesional no pertenece a esta clinica" };
  return { ok: true };
}
