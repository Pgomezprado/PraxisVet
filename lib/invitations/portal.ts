import "server-only";
import { createAdminClient } from "@/lib/supabase/admin.server";
import { sendPortalInvitationEmail } from "@/lib/email/portal-invitation";
import { logPortalAuditEvent } from "@/lib/audit/portal-audit";

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

/**
 * Crea/actualiza el vínculo tutor ↔ clínica y envía un magic link al email
 * registrado en la ficha del cliente. Al clickearlo, el tutor aterriza en
 * /auth/portal-bootstrap/[clinic] que completa el vínculo.
 */
export async function invitePortalAccess(params: {
  clientId: string;
  orgId: string;
  orgName: string;
  orgSlug: string;
  email: string;
  tutorFirstName: string;
  invitedByMemberId: string;
}): Promise<InviteResult> {
  const admin = createAdminClient();
  const email = params.email.trim().toLowerCase();

  if (!email) {
    return {
      success: false,
      error: "El cliente no tiene email registrado.",
    };
  }

  // Upsert: si ya existe vínculo para este (client, org), lo reactivamos.
  const { data: existing } = await admin
    .from("client_auth_links")
    .select("id, user_id, linked_at, active, revoked_at")
    .eq("client_id", params.clientId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  let linkId: string | null = existing?.id ?? null;

  if (existing) {
    const { error: updateErr } = await admin
      .from("client_auth_links")
      .update({
        email,
        active: true,
        revoked_at: null,
        invited_at: new Date().toISOString(),
        invited_by: params.invitedByMemberId,
      })
      .eq("id", existing.id);

    if (updateErr) {
      return {
        success: false,
        error: `No se pudo actualizar el vínculo: ${updateErr.message}`,
      };
    }
  } else {
    const { data: inserted, error: insertErr } = await admin
      .from("client_auth_links")
      .insert({
        client_id: params.clientId,
        org_id: params.orgId,
        email,
        invited_by: params.invitedByMemberId,
      })
      .select("id")
      .single();

    if (insertErr) {
      return {
        success: false,
        error: `No se pudo crear el vínculo: ${insertErr.message}`,
      };
    }
    linkId = inserted.id;
  }

  await logPortalAuditEvent({
    orgId: params.orgId,
    event: "link_requested",
    linkId,
    metadata: { email, reactivated: Boolean(existing) },
  });

  // Magic link de Supabase. Redirige al callback, que luego pasa por el
  // bootstrap para completar linked_at.
  const redirectTo = `${appBaseUrl()}/auth/callback?next=${encodeURIComponent(
    `/auth/portal-bootstrap/${params.orgSlug}`
  )}`;

  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

  if (linkErr || !linkData?.properties?.action_link) {
    return {
      success: false,
      error: linkErr?.message ?? "No se pudo generar el enlace de acceso",
    };
  }

  try {
    await sendPortalInvitationEmail({
      to: email,
      tutorName: params.tutorFirstName,
      orgName: params.orgName,
      portalUrl: linkData.properties.action_link,
    });
  } catch (err) {
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

export async function revokePortalAccess(params: {
  clientId: string;
  orgId: string;
}): Promise<InviteResult> {
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("client_auth_links")
    .select("id, user_id")
    .eq("client_id", params.clientId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  const { error } = await admin
    .from("client_auth_links")
    .update({
      active: false,
      revoked_at: new Date().toISOString(),
    })
    .eq("client_id", params.clientId)
    .eq("org_id", params.orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  if (link) {
    await logPortalAuditEvent({
      orgId: params.orgId,
      event: "access_revoked",
      linkId: link.id,
      userId: link.user_id ?? null,
    });
  }
  return { success: true };
}

export type ClientAuthLinkStatus = {
  exists: boolean;
  active: boolean;
  linked: boolean;
  invitedAt: string | null;
  linkedAt: string | null;
};

export async function getPortalLinkStatus(params: {
  clientId: string;
  orgId: string;
}): Promise<ClientAuthLinkStatus> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("client_auth_links")
    .select("active, linked_at, invited_at")
    .eq("client_id", params.clientId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  if (!data) {
    return {
      exists: false,
      active: false,
      linked: false,
      invitedAt: null,
      linkedAt: null,
    };
  }
  return {
    exists: true,
    active: data.active ?? false,
    linked: data.linked_at !== null,
    invitedAt: data.invited_at ?? null,
    linkedAt: data.linked_at ?? null,
  };
}
