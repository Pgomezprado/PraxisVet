import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin.server";
import {
  logPortalAuditEvent,
  extractClientIp,
} from "@/lib/audit/portal-audit";
import { checkPortalRateLimit } from "@/lib/rate-limit/portal";

/**
 * Callback del magic link del portal del tutor.
 *
 * Endurecido en Sprint 5 (Bloque 1):
 *   1. Rate limit por IP+email (5 intentos / 5 min) antes de tocar la DB.
 *   2. Cada path de error registra `bootstrap_failed` en audit con metadata.
 *   3. Redirección con un único error genérico para evitar enumeration de
 *      emails registrados.
 *   4. Verifica que el vínculo no esté revocado ni expirado antes de
 *      completar `linked_at`.
 *   5. Actualiza `last_accessed_at` y registra `link_consumed` (primer login)
 *      o `access_granted` (login posterior).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_ERROR = "portal_access_denied";

function denied(origin: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/auth/login?error=${GENERIC_ERROR}`, origin)
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clinic: string }> }
) {
  const { clinic } = await context.params;
  const { origin } = new URL(request.url);
  const ip = extractClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No hay sesión: rate-limit por IP solamente y log genérico.
  if (!user || !user.email) {
    const limit = checkPortalRateLimit(ip, "no-session");
    if (!limit.ok) {
      return new NextResponse("Too many attempts", {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      });
    }
    return denied(origin);
  }

  // Rate limit por IP+email del usuario autenticado.
  const limit = checkPortalRateLimit(ip, user.email);
  if (!limit.ok) {
    return new NextResponse("Too many attempts", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const admin = createAdminClient();

  // 1) Resolver la org por slug.
  const { data: org } = await admin
    .from("organizations")
    .select("id, slug")
    .eq("slug", clinic)
    .maybeSingle();

  if (!org) {
    // Sin org no podemos atribuir el log a una clínica concreta.
    return denied(origin);
  }

  const emailLc = user.email.trim().toLowerCase();

  // 2) Buscar un vínculo para ese email en esa org (incluye revocados y expirados).
  const { data: pendingLink } = await admin
    .from("client_auth_links")
    .select(
      "id, user_id, linked_at, active, revoked_at, expires_at, client_id"
    )
    .eq("org_id", org.id)
    .ilike("email", emailLc)
    .maybeSingle();

  if (!pendingLink) {
    await logPortalAuditEvent({
      orgId: org.id,
      event: "bootstrap_failed",
      userId: user.id,
      ip,
      userAgent,
      metadata: { reason: "no_link_for_email" },
    });
    return denied(origin);
  }

  // 3) Vínculo revocado o inactivo.
  if (!pendingLink.active || pendingLink.revoked_at) {
    await logPortalAuditEvent({
      orgId: org.id,
      event: "bootstrap_failed",
      linkId: pendingLink.id,
      userId: user.id,
      ip,
      userAgent,
      metadata: { reason: "link_revoked" },
    });
    return denied(origin);
  }

  // 4) Vínculo expirado.
  if (pendingLink.expires_at && new Date(pendingLink.expires_at) <= new Date()) {
    await logPortalAuditEvent({
      orgId: org.id,
      event: "bootstrap_failed",
      linkId: pendingLink.id,
      userId: user.id,
      ip,
      userAgent,
      metadata: { reason: "link_expired" },
    });
    return denied(origin);
  }

  // 5) Si estaba linked a otro user_id, no pisar.
  if (pendingLink.linked_at && pendingLink.user_id !== user.id) {
    await logPortalAuditEvent({
      orgId: org.id,
      event: "bootstrap_failed",
      linkId: pendingLink.id,
      userId: user.id,
      ip,
      userAgent,
      metadata: { reason: "user_mismatch" },
    });
    return denied(origin);
  }

  const isFirstConsume = !pendingLink.linked_at;
  const nowIso = new Date().toISOString();

  // 6) Completar vínculo (primer login) o actualizar last_accessed_at.
  const updates: Record<string, unknown> = { last_accessed_at: nowIso };
  if (isFirstConsume) {
    updates.user_id = user.id;
    updates.linked_at = nowIso;
  }

  const { error: updateErr } = await admin
    .from("client_auth_links")
    .update(updates)
    .eq("id", pendingLink.id);

  if (updateErr) {
    await logPortalAuditEvent({
      orgId: org.id,
      event: "bootstrap_failed",
      linkId: pendingLink.id,
      userId: user.id,
      ip,
      userAgent,
      metadata: { reason: "db_update_failed", message: updateErr.message },
    });
    return denied(origin);
  }

  await logPortalAuditEvent({
    orgId: org.id,
    event: isFirstConsume ? "link_consumed" : "access_granted",
    linkId: pendingLink.id,
    userId: user.id,
    ip,
    userAgent,
  });

  return NextResponse.redirect(new URL(`/tutor/${clinic}`, origin));
}
