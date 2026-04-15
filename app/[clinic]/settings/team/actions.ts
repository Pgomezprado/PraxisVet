"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  teamMemberSchema,
  type TeamMemberInput,
} from "@/lib/validations/team-members";
import { createAndSendInvitation } from "@/lib/invitations/service";
import type { OrganizationMember } from "@/types";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function getTeamMembers(
  orgId: string
): Promise<ActionResult<OrganizationMember[]>> {
  const { supabase } = await getAuthContext();

  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("org_id", orgId)
    .order("active", { ascending: false })
    .order("first_name", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as OrganizationMember[] };
}

export async function getTeamMember(
  memberId: string
): Promise<ActionResult<OrganizationMember>> {
  const { supabase } = await getAuthContext();

  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("id", memberId)
    .single();

  if (error || !data) {
    return { success: false, error: "Miembro no encontrado" };
  }

  return { success: true, data: data as OrganizationMember };
}

export async function createTeamMember(
  orgId: string,
  clinicSlug: string,
  input: TeamMemberInput
): Promise<ActionResult<{ id: string; invited: boolean }>> {
  const parsed = teamMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await getAuthContext();

  const { data, error } = await supabase
    .from("organization_members")
    .insert({
      org_id: orgId,
      user_id: null,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name || null,
      role: parsed.data.role,
      specialty: parsed.data.specialty || null,
      active: true,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  let invited = false;
  const email = parsed.data.email?.trim();
  if (email) {
    const inviteRes = await createAndSendInvitation({
      memberId: data.id,
      email,
      invitedBy: user.id,
    });
    if (!inviteRes.success) {
      revalidatePath(`/${clinicSlug}/settings/team`);
      return {
        success: false,
        error: `Miembro creado, pero falló el envío: ${inviteRes.error}`,
      };
    }
    invited = true;
  }

  revalidatePath(`/${clinicSlug}/settings/team`);
  return { success: true, data: { id: data.id, invited } };
}

export async function inviteExistingMember(
  memberId: string,
  clinicSlug: string,
  email: string
): Promise<ActionResult> {
  const { user } = await getAuthContext();

  const result = await createAndSendInvitation({
    memberId,
    email: email.trim(),
    invitedBy: user.id,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/${clinicSlug}/settings/team`);
  return { success: true, data: undefined };
}

export async function updateTeamMember(
  memberId: string,
  clinicSlug: string,
  input: TeamMemberInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = teamMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase } = await getAuthContext();

  const { data, error } = await supabase
    .from("organization_members")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name || null,
      role: parsed.data.role,
      specialty: parsed.data.specialty || null,
    })
    .eq("id", memberId)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/settings/team`);
  return { success: true, data: { id: data.id } };
}

export async function toggleMemberActive(
  memberId: string,
  clinicSlug: string,
  active: boolean
): Promise<ActionResult> {
  const { supabase } = await getAuthContext();

  const { error } = await supabase
    .from("organization_members")
    .update({ active })
    .eq("id", memberId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/settings/team`);
  return { success: true, data: undefined };
}
