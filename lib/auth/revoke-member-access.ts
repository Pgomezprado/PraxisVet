import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin.server";

type RevokeResult =
  | { success: true; sessionClosed: boolean }
  | { success: false; error: string };

export async function revokeMemberAccess(
  memberId: string
): Promise<RevokeResult> {
  const supabase = await createClient();

  const { data: member, error: fetchErr } = await supabase
    .from("organization_members")
    .select("id, user_id, active")
    .eq("id", memberId)
    .single();

  if (fetchErr || !member) {
    return { success: false, error: "Miembro no encontrado" };
  }

  const { data: updated, error: updateErr } = await supabase
    .from("organization_members")
    .update({ active: false })
    .eq("id", memberId)
    .select("id")
    .single();

  if (updateErr || !updated) {
    return {
      success: false,
      error: updateErr?.message ?? "No se pudo desactivar el miembro",
    };
  }

  if (!member.user_id) {
    return { success: true, sessionClosed: false };
  }

  const admin = createAdminClient();
  const { error: signOutErr } = await admin.auth.admin.signOut(
    member.user_id,
    "global"
  );

  if (signOutErr) {
    return {
      success: false,
      error: `Miembro desactivado, pero no se pudo cerrar su sesión: ${signOutErr.message}`,
    };
  }

  return { success: true, sessionClosed: true };
}

export async function restoreMemberAccess(
  memberId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_members")
    .update({ active: true })
    .eq("id", memberId)
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "No se pudo reactivar el miembro",
    };
  }

  return { success: true };
}
