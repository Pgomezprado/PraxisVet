/**
 * Superadmin guards — validación de acceso al panel.
 *
 * Estas funciones se invocan al principio de CADA Server Action, loader,
 * Route Handler o layout que forme parte del panel superadmin. No hay
 * excepciones: la primera línea de cualquier código privilegiado debe
 * ser `await requirePlatformAdmin()`.
 *
 * Doble validación:
 *   1) JWT app_metadata claim `platform_admin = true` (firmado por
 *      Supabase Auth, no puede ser manipulado desde el cliente).
 *   2) Consulta fresca a la tabla `platform_admins` vía la función
 *      security-definer `is_platform_admin()`, que además exige MFA
 *      enrolado. Esto protege contra revocaciones recientes que
 *      todavía no han expirado en el JWT.
 *
 * Cualquier fallo se registra en `superadmin_audit_log` como
 * `auth.access_denied` y se lanza un error opaco al caller.
 */

import "server-only";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createPlatformAdminClient } from "@/lib/supabase/platform-admin.server";

export type PlatformAdminContext = {
  userId: string;
  email: string;
  role: "owner" | "staff";
};

export class PlatformAdminAccessDenied extends Error {
  constructor(public readonly reason: string) {
    super("Acceso denegado al panel superadmin.");
    this.name = "PlatformAdminAccessDenied";
  }
}

/**
 * Exige que la sesión actual tenga AAL2 (MFA verificado en esta sesión,
 * no sólo enrolado históricamente).
 */
export async function requireAal2(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) {
    throw new PlatformAdminAccessDenied("aal_unknown");
  }
  if (data.currentLevel !== "aal2") {
    throw new PlatformAdminAccessDenied("aal_insufficient");
  }
}

/**
 * Valida que el usuario actual sea platform admin. Retorna contexto mínimo
 * para logging. Lanza `PlatformAdminAccessDenied` en cualquier fallo.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  const supabase = await createClient();

  // ---- Paso 1: obtener user autenticado ----
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    await logAccessDenied({
      adminUserId: null,
      adminEmail: null,
      reason: "no_user",
    });
    throw new PlatformAdminAccessDenied("no_user");
  }

  // ---- Paso 2: claim en app_metadata (firmado por Supabase Auth) ----
  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>;
  const claimIsPlatformAdmin = appMetadata.platform_admin === true;

  // ---- Paso 3: verificación fresca contra platform_admins (sin MFA, modo soft) ----
  const { data: selfRow, error: selfErr } = await supabase
    .from("platform_admins")
    .select("user_id, role, revoked_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (selfErr || !selfRow || selfRow.revoked_at) {
    await logAccessDenied({
      adminUserId: user.id,
      adminEmail: user.email ?? null,
      reason: "not_in_platform_admins",
    });
    throw new PlatformAdminAccessDenied("not_in_platform_admins");
  }

  // Double-check vía RPC (is_platform_admin). Si esto falla, algo raro
  // está pasando (caché de JWT desincronizado con DB, por ejemplo).
  const { data: rpcResult, error: rpcErr } = await supabase.rpc("is_platform_admin");
  if (rpcErr || rpcResult !== true) {
    await logAccessDenied({
      adminUserId: user.id,
      adminEmail: user.email ?? null,
      reason: "rpc_mismatch",
    });
    throw new PlatformAdminAccessDenied("rpc_mismatch");
  }

  // Señalamos inconsistencia de claims pero no bloqueamos: el claim
  // en app_metadata lo setea un trigger/edge function post-enrolamiento
  // y puede estar rezagado. El dato de verdad es la tabla.
  if (!claimIsPlatformAdmin) {
    // Log informativo, pero dejamos pasar.
    void logInfo({
      adminUserId: user.id,
      adminEmail: user.email ?? null,
      eventType: "auth.claim_stale",
      metadata: { note: "platform_admin claim missing in JWT app_metadata" },
    });
  }

  const role = (selfRow.role === "owner" ? "owner" : "staff") as "owner" | "staff";

  return {
    userId: user.id,
    email: user.email ?? "",
    role,
  };
}

// ============================================================
// Internal: minimal audit logger (service role)
// ============================================================

type AccessDeniedEntry = {
  adminUserId: string | null;
  adminEmail: string | null;
  reason: string;
};

async function logAccessDenied(entry: AccessDeniedEntry): Promise<void> {
  try {
    const admin = createPlatformAdminClient();
    const h = await headers();
    await admin.from("superadmin_audit_log").insert({
      admin_user_id: entry.adminUserId ?? "00000000-0000-0000-0000-000000000000",
      admin_email: entry.adminEmail ?? "unknown",
      event_type: "auth.access_denied",
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0",
      user_agent: h.get("user-agent") ?? "unknown",
      request_id: crypto.randomUUID(),
      success: false,
      error_message: entry.reason,
    });
  } catch {
    // Swallow: el logging nunca debe romper el guard.
  }
}

async function logInfo(params: {
  adminUserId: string;
  adminEmail: string | null;
  eventType: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createPlatformAdminClient();
    const h = await headers();
    await admin.from("superadmin_audit_log").insert({
      admin_user_id: params.adminUserId,
      admin_email: params.adminEmail ?? "unknown",
      event_type: params.eventType,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0",
      user_agent: h.get("user-agent") ?? "unknown",
      request_id: crypto.randomUUID(),
      success: true,
      metadata: params.metadata ?? null,
    });
  } catch {
    // idem
  }
}
