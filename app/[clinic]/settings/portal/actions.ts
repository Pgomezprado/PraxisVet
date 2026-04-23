"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin.server";
import { logPortalAuditEvent } from "@/lib/audit/portal-audit";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireAdminForOrg(
  clinicSlug: string
): Promise<
  | {
      ok: true;
      orgId: string;
      orgSlug: string;
    }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id, role, organizations!inner(slug)")
    .eq("user_id", user.id)
    .eq("active", true)
    .eq("organizations.slug", clinicSlug)
    .maybeSingle();

  if (!membership) return { ok: false, error: "Clínica no encontrada" };
  if (membership.role !== "admin") {
    return {
      ok: false,
      error: "Solo administradores pueden gestionar el portal del tutor.",
    };
  }
  return { ok: true, orgId: membership.org_id as string, orgSlug: clinicSlug };
}

async function requireLinkInOrg(
  linkId: string,
  orgId: string
): Promise<
  | { ok: true; link: { id: string; user_id: string | null } }
  | { ok: false; error: string }
> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("client_auth_links")
    .select("id, user_id, org_id")
    .eq("id", linkId)
    .maybeSingle();

  if (!data || data.org_id !== orgId) {
    return { ok: false, error: "Vínculo no pertenece a esta clínica." };
  }
  return {
    ok: true,
    link: { id: data.id as string, user_id: (data.user_id as string) ?? null },
  };
}

export type PortalLinkRow = {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  email: string;
  invited_at: string;
  linked_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  last_accessed_at: string | null;
  active: boolean;
  status: "linked" | "pending" | "expired" | "revoked";
};

function deriveStatus(row: {
  active: boolean;
  linked_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
}): PortalLinkRow["status"] {
  if (!row.active || row.revoked_at) return "revoked";
  if (row.expires_at && new Date(row.expires_at) <= new Date()) return "expired";
  if (!row.linked_at) return "pending";
  return "linked";
}

export async function listPortalLinks(
  clinicSlug: string
): Promise<ActionResult<PortalLinkRow[]>> {
  const guard = await requireAdminForOrg(clinicSlug);
  if (!guard.ok) return { success: false, error: guard.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("client_auth_links")
    .select(
      `
      id, email, invited_at, linked_at, revoked_at, expires_at,
      last_accessed_at, active, client_id,
      client:clients!client_id (id, first_name, last_name, email)
      `
    )
    .eq("org_id", guard.orgId)
    .order("invited_at", { ascending: false });

  if (error) return { success: false, error: error.message };

  type Row = {
    id: string;
    email: string;
    invited_at: string;
    linked_at: string | null;
    revoked_at: string | null;
    expires_at: string | null;
    last_accessed_at: string | null;
    active: boolean;
    client_id: string;
    client: {
      id: string;
      first_name: string;
      last_name: string;
      email: string | null;
    };
  };

  const rows: PortalLinkRow[] = (data ?? []).map((r) => {
    const row = r as unknown as Row;
    return {
      id: row.id,
      client_id: row.client_id,
      client_name: `${row.client.first_name} ${row.client.last_name}`,
      client_email: row.client.email ?? "",
      email: row.email,
      invited_at: row.invited_at,
      linked_at: row.linked_at,
      revoked_at: row.revoked_at,
      expires_at: row.expires_at,
      last_accessed_at: row.last_accessed_at,
      active: row.active,
      status: deriveStatus(row),
    };
  });

  return { success: true, data: rows };
}

const expirationSchema = z.object({
  linkId: z.string().uuid(),
  expiresAt: z.string().nullable(),
});

export async function setPortalLinkExpiration(
  clinicSlug: string,
  input: z.infer<typeof expirationSchema>
): Promise<ActionResult> {
  const parsed = expirationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const guard = await requireAdminForOrg(clinicSlug);
  if (!guard.ok) return { success: false, error: guard.error };

  const linkGuard = await requireLinkInOrg(parsed.data.linkId, guard.orgId);
  if (!linkGuard.ok) return { success: false, error: linkGuard.error };

  const admin = createAdminClient();
  const expiresAtIso = parsed.data.expiresAt
    ? new Date(parsed.data.expiresAt).toISOString()
    : null;

  const { error } = await admin
    .from("client_auth_links")
    .update({ expires_at: expiresAtIso })
    .eq("id", parsed.data.linkId);

  if (error) return { success: false, error: error.message };

  await logPortalAuditEvent({
    orgId: guard.orgId,
    event: "expiration_set",
    linkId: parsed.data.linkId,
    userId: linkGuard.link.user_id,
    metadata: { expires_at: expiresAtIso },
  });

  revalidatePath(`/${clinicSlug}/settings/portal`);
  return { success: true, data: undefined };
}

export async function revokePortalLinkById(
  clinicSlug: string,
  linkId: string
): Promise<ActionResult> {
  const guard = await requireAdminForOrg(clinicSlug);
  if (!guard.ok) return { success: false, error: guard.error };

  const linkGuard = await requireLinkInOrg(linkId, guard.orgId);
  if (!linkGuard.ok) return { success: false, error: linkGuard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("client_auth_links")
    .update({
      active: false,
      revoked_at: new Date().toISOString(),
    })
    .eq("id", linkId);

  if (error) return { success: false, error: error.message };

  await logPortalAuditEvent({
    orgId: guard.orgId,
    event: "access_revoked",
    linkId,
    userId: linkGuard.link.user_id,
  });

  revalidatePath(`/${clinicSlug}/settings/portal`);
  return { success: true, data: undefined };
}

export async function restorePortalLinkById(
  clinicSlug: string,
  linkId: string
): Promise<ActionResult> {
  const guard = await requireAdminForOrg(clinicSlug);
  if (!guard.ok) return { success: false, error: guard.error };

  const linkGuard = await requireLinkInOrg(linkId, guard.orgId);
  if (!linkGuard.ok) return { success: false, error: linkGuard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("client_auth_links")
    .update({
      active: true,
      revoked_at: null,
    })
    .eq("id", linkId);

  if (error) return { success: false, error: error.message };

  await logPortalAuditEvent({
    orgId: guard.orgId,
    event: "access_renewed",
    linkId,
    userId: linkGuard.link.user_id,
  });

  revalidatePath(`/${clinicSlug}/settings/portal`);
  return { success: true, data: undefined };
}

export type PortalAuditRow = {
  id: string;
  event: string;
  occurred_at: string;
  ip: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
};

export async function getPortalLinkAuditLog(
  clinicSlug: string,
  linkId: string,
  limit = 25
): Promise<ActionResult<PortalAuditRow[]>> {
  const guard = await requireAdminForOrg(clinicSlug);
  if (!guard.ok) return { success: false, error: guard.error };

  const linkGuard = await requireLinkInOrg(linkId, guard.orgId);
  if (!linkGuard.ok) return { success: false, error: linkGuard.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("client_auth_audit")
    .select("id, event, occurred_at, ip, user_agent, metadata")
    .eq("client_auth_link_id", linkId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as PortalAuditRow[] };
}
