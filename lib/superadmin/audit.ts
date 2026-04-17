/**
 * Superadmin audit logger.
 *
 * Inserta un registro en `superadmin_audit_log` por cada acción observable
 * del panel superadmin. Logging best-effort: si la inserción falla (red,
 * credenciales, tabla indisponible), NO se interrumpe la request.
 *
 * Usa el cliente service_role vía `createPlatformAdminClient()`.
 * La tabla `superadmin_audit_log` sólo acepta INSERT desde service_role
 * (UPDATE/DELETE revocados explícitamente para todos los roles).
 */

import "server-only";
import { headers } from "next/headers";
import { createPlatformAdminClient } from "@/lib/supabase/platform-admin.server";

export type SuperadminAction = "view_overview" | "view_org_detail";

type LogParams = {
  /** Acción lógica del panel. Se mapea a event_type = `panel.${action}`. */
  action: SuperadminAction;
  /** Usuario autenticado que ejecuta la acción. */
  actorUserId: string;
  actorEmail: string;
  /** Clínica objetivo (si aplica). */
  orgId?: string | null;
  /** Metadata adicional opcional (jsonb). */
  metadata?: Record<string, unknown> | null;
};

export async function logSuperadminAction(params: LogParams): Promise<void> {
  try {
    const admin = createPlatformAdminClient();
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "0.0.0.0";

    await admin.from("superadmin_audit_log").insert({
      admin_user_id: params.actorUserId,
      admin_email: params.actorEmail || "unknown",
      event_type: `panel.${params.action}`,
      target_clinic_id: params.orgId ?? null,
      ip,
      user_agent: h.get("user-agent") ?? "unknown",
      request_id: crypto.randomUUID(),
      success: true,
      metadata: params.metadata ?? null,
    });
  } catch {
    // best-effort: no tirar la página si el audit log falla
  }
}
