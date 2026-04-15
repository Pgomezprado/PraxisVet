import "server-only";
import { createAdminClient } from "@/lib/supabase/admin.server";
import { sendInviteEmail } from "@/lib/invitations/email";
import {
  generateInviteToken,
  hashInviteToken,
  INVITE_TTL_DAYS,
} from "@/lib/invitations/tokens";
import { roleLabels } from "@/lib/validations/team-members";
import type { MemberRole } from "@/types";

type InviteResult =
  | { success: true }
  | { success: false; error: string };

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL?.replace(/^/, "https://") ||
    "http://localhost:3000"
  );
}

export async function createAndSendInvitation(params: {
  memberId: string;
  email: string;
  invitedBy: string;
}): Promise<InviteResult> {
  const admin = createAdminClient();

  const { data: member, error: memberErr } = await admin
    .from("organization_members")
    .select("id, org_id, user_id, first_name, last_name, role, active")
    .eq("id", params.memberId)
    .single();

  if (memberErr || !member) {
    return { success: false, error: "Miembro no encontrado" };
  }
  if (member.user_id) {
    return {
      success: false,
      error: "Este miembro ya tiene una cuenta activa",
    };
  }
  if (!member.active) {
    return { success: false, error: "El miembro está inactivo" };
  }

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", member.org_id)
    .single();

  if (orgErr || !org) {
    return { success: false, error: "Organización no encontrada" };
  }

  // Revoca cualquier invitación pendiente previa para este miembro
  await admin
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("member_id", member.id)
    .is("accepted_at", null)
    .is("revoked_at", null);

  const { raw, hash } = generateInviteToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  const { error: insertErr } = await admin.from("invitations").insert({
    org_id: member.org_id,
    member_id: member.id,
    email: params.email,
    token_hash: hash,
    invited_by: params.invitedBy,
    expires_at: expiresAt.toISOString(),
  });

  if (insertErr) {
    return { success: false, error: insertErr.message };
  }

  const acceptUrl = `${appBaseUrl()}/accept-invite/${raw}`;
  const fullName = [member.first_name, member.last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || "equipo";

  try {
    await sendInviteEmail({
      to: params.email,
      orgName: org.name,
      inviteeName: fullName,
      roleLabel: roleLabels[member.role as MemberRole],
      acceptUrl,
      expiresInDays: INVITE_TTL_DAYS,
    });
  } catch (err) {
    // Si el envío falla, revoca la invitación para poder reintentar
    await admin
      .from("invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", hash);
    return {
      success: false,
      error:
        err instanceof Error
          ? `No se pudo enviar el email: ${err.message}`
          : "No se pudo enviar el email",
    };
  }

  return { success: true };
}

export async function findValidInvitationByToken(rawToken: string) {
  const admin = createAdminClient();
  const hash = hashInviteToken(rawToken);

  const { data, error } = await admin
    .from("invitations")
    .select(
      `
      id, org_id, member_id, email, expires_at, accepted_at, revoked_at,
      organization:organizations(name),
      member:organization_members(id, first_name, last_name, role, user_id)
    `
    )
    .eq("token_hash", hash)
    .single();

  if (error || !data) return null;
  if (data.accepted_at) return { ...data, status: "accepted" as const };
  if (data.revoked_at) return { ...data, status: "revoked" as const };
  if (new Date(data.expires_at) < new Date())
    return { ...data, status: "expired" as const };
  return { ...data, status: "valid" as const };
}

export async function acceptInvitation(params: {
  rawToken: string;
  password: string;
}): Promise<
  | { success: true; email: string }
  | { success: false; error: string }
> {
  const admin = createAdminClient();
  const invitation = await findValidInvitationByToken(params.rawToken);

  if (!invitation) {
    return { success: false, error: "Invitación no encontrada" };
  }
  if (invitation.status === "accepted") {
    return { success: false, error: "Esta invitación ya fue aceptada" };
  }
  if (invitation.status === "revoked") {
    return { success: false, error: "Esta invitación fue revocada" };
  }
  if (invitation.status === "expired") {
    return { success: false, error: "Esta invitación ha expirado" };
  }

  // Crea el usuario en auth.users (email_confirm true → no pide verificación)
  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email: invitation.email,
      password: params.password,
      email_confirm: true,
    });

  const userId = created?.user?.id;

  if (createErr || !userId) {
    // Si el email ya existe en auth.users, rechazamos (no promovemos silenciosamente)
    if (createErr?.message?.toLowerCase().includes("already")) {
      return {
        success: false,
        error:
          "Ya existe una cuenta con este email. Inicia sesión o contacta al administrador.",
      };
    }
    return {
      success: false,
      error: createErr?.message || "No se pudo crear la cuenta",
    };
  }

  // Vincula el user_id al organization_member existente
  const { error: linkErr } = await admin
    .from("organization_members")
    .update({ user_id: userId })
    .eq("id", invitation.member_id);

  if (linkErr) {
    // Rollback: borra el usuario creado si no pudimos vincularlo
    await admin.auth.admin.deleteUser(userId);
    return { success: false, error: linkErr.message };
  }

  // Marca invitación como aceptada
  await admin
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  return { success: true, email: invitation.email };
}
