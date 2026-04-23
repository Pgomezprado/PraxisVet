/**
 * Portal del tutor — audit logger.
 *
 * Inserta filas en `client_auth_audit` para los eventos críticos del ciclo de
 * vida del acceso del tutor. Logging best-effort: si la inserción falla, NO
 * se interrumpe la request original.
 *
 * La tabla solo permite SELECT a staff de la org via RLS; escritura ocurre
 * únicamente con service_role (no hay policy INSERT para authenticated).
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin.server";

export type PortalAuditEvent =
  | "link_requested"
  | "link_consumed"
  | "access_granted"
  | "access_revoked"
  | "access_renewed"
  | "expiration_set"
  | "bootstrap_failed";

type LogParams = {
  orgId: string;
  event: PortalAuditEvent;
  linkId?: string | null;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function logPortalAuditEvent(params: LogParams): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("client_auth_audit").insert({
      org_id: params.orgId,
      event: params.event,
      client_auth_link_id: params.linkId ?? null,
      user_id: params.userId ?? null,
      ip: params.ip ?? null,
      user_agent: params.userAgent ?? null,
      metadata: params.metadata ?? null,
    });
  } catch {
    // best-effort
  }
}

export function extractClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}
