"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  petId: z.string().uuid(),
  preferredDate: z.string().min(1, "Selecciona una fecha"),
  preferredTime: z.string().min(1, "Selecciona un horario aproximado"),
  type: z.enum(["medical", "grooming"]),
  reason: z.string().max(500).optional().or(z.literal("")),
});

type ActionResult = { success: true } | { success: false; error: string };

const HEALTH_CARD_TTL_DAYS = 30;

function generateHealthCardToken(): string {
  // 24 bytes → 32 chars en base64url, criptográficamente aleatorio.
  return randomBytes(24).toString("base64url");
}

async function publicBaseUrl(): Promise<string> {
  // En local, usar el host real del request para que el QR sea escaneable
  // desde otros dispositivos en la misma red (ej. celular → IP LAN del Mac).
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl.replace(/\/$/, "");
  }

  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto =
      h.get("x-forwarded-proto") ||
      (host && host.startsWith("localhost") ? "http" : "https");
    if (host) return `${proto}://${host}`;
  } catch {
    // headers() no disponible (build time, etc.) — caemos al fallback
  }

  return (envUrl || "https://praxisvet.cl").replace(/\/$/, "");
}

/**
 * El tutor solicita una cita. La cita queda en status='pending' y la clínica
 * la confirma o rechaza desde su agenda.
 *
 * La policy RLS `appointments_tutor_request` se encarga de validar que:
 *   - status = 'pending'
 *   - pet_id pertenece a una mascota del tutor (via is_tutor_of_pet)
 *   - date >= hoy
 */
export async function requestAppointment(
  clinicSlug: string,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    petId: formData.get("petId")?.toString() ?? "",
    preferredDate: formData.get("preferredDate")?.toString() ?? "",
    preferredTime: formData.get("preferredTime")?.toString() ?? "",
    type: formData.get("type")?.toString() ?? "medical",
    reason: formData.get("reason")?.toString() ?? "",
  };

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  // Resolver org via el vínculo activo del tutor para esta clínica.
  const { data: link } = await supabase
    .from("client_auth_links")
    .select(
      "id, org_id, organizations!inner(slug)"
    )
    .eq("user_id", user.id)
    .eq("active", true)
    .not("linked_at", "is", null)
    .eq("organizations.slug", clinicSlug)
    .maybeSingle();

  if (!link) {
    return { success: false, error: "No perteneces a esta clínica." };
  }

  // Validar que la mascota pertenece a este tutor (además de RLS).
  const { data: pet } = await supabase
    .from("pets")
    .select("id, client_id, org_id")
    .eq("id", parsed.data.petId)
    .eq("org_id", link.org_id)
    .maybeSingle();

  if (!pet) {
    return { success: false, error: "La mascota no pertenece a esta clínica." };
  }

  // Insert en appointments — RLS valida ownership con is_tutor_of_pet.
  const startTime = parsed.data.preferredTime.length === 5
    ? `${parsed.data.preferredTime}:00`
    : parsed.data.preferredTime;

  const { error } = await supabase.from("appointments").insert({
    org_id: link.org_id,
    pet_id: pet.id,
    client_id: pet.client_id,
    date: parsed.data.preferredDate,
    start_time: startTime,
    status: "pending",
    type: parsed.data.type,
    reason: parsed.data.reason?.trim() || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/tutor/${clinicSlug}`);
  return { success: true };
}

// ============================================================
// Cartola Sanitaria QR
// ============================================================

const generateCardSchema = z.object({
  petId: z.string().uuid("Mascota inválida"),
});

const revokeCardSchema = z.object({
  cardId: z.string().uuid("Cartola inválida"),
});

const listCardsSchema = z.object({
  petId: z.string().uuid("Mascota inválida"),
});

export type HealthCardStatus = "active" | "expired" | "revoked";

export type HealthCardSummary = {
  id: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  status: HealthCardStatus;
  url: string;
};

type GenerateCardResult =
  | {
      success: true;
      data: {
        id: string;
        token: string;
        url: string;
        expiresAt: string;
      };
    }
  | { success: false; error: string };

type ListCardsResult =
  | { success: true; data: HealthCardSummary[] }
  | { success: false; error: string };

function computeStatus(
  expiresAt: string,
  revokedAt: string | null
): HealthCardStatus {
  if (revokedAt) return "revoked";
  if (new Date(expiresAt).getTime() <= Date.now()) return "expired";
  return "active";
}

/**
 * El tutor genera una cartola sanitaria QR para una de sus mascotas.
 * - Token URL-safe de 32 chars (24 bytes random).
 * - Vence a los 30 días.
 * - RLS valida que el tutor sea dueño de la mascota.
 * - El trigger de DB valida consistencia pet/client/org.
 */
export async function generateHealthCard(
  clinicSlug: string,
  input: { petId: string }
): Promise<GenerateCardResult> {
  const parsed = generateCardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  // Validamos que la mascota pertenece a este tutor en esta clínica.
  const { data: link } = await supabase
    .from("client_auth_links")
    .select("client_id, org_id, organizations!inner(slug)")
    .eq("user_id", user.id)
    .eq("active", true)
    .not("linked_at", "is", null)
    .eq("organizations.slug", clinicSlug)
    .maybeSingle();

  if (!link) {
    return { success: false, error: "No perteneces a esta clínica." };
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("id, client_id, org_id")
    .eq("id", parsed.data.petId)
    .eq("org_id", link.org_id)
    .eq("client_id", link.client_id)
    .maybeSingle();

  if (!pet) {
    return { success: false, error: "Mascota no encontrada." };
  }

  const token = generateHealthCardToken();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + HEALTH_CARD_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  const { data: inserted, error } = await supabase
    .from("pet_health_cards")
    .insert({
      pet_id: pet.id,
      org_id: pet.org_id,
      client_id: pet.client_id,
      token,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select("id, token, expires_at")
    .single();

  if (error || !inserted) {
    return {
      success: false,
      error: error?.message ?? "No se pudo generar la cartola",
    };
  }

  revalidatePath(`/tutor/${clinicSlug}/pets/${pet.id}`);

  const base = await publicBaseUrl();
  return {
    success: true,
    data: {
      id: inserted.id,
      token: inserted.token,
      url: `${base}/c/${inserted.token}`,
      expiresAt: inserted.expires_at,
    },
  };
}

/**
 * El tutor revoca una cartola activa. Set `revoked_at = now()`.
 * RLS limita el universo a sus mascotas; igual chequeamos rows afectadas.
 */
export async function revokeHealthCard(
  clinicSlug: string,
  input: { cardId: string }
): Promise<ActionResult> {
  const parsed = revokeCardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data: updated, error } = await supabase
    .from("pet_health_cards")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.cardId)
    .is("revoked_at", null)
    .select("id, pet_id");

  if (error) {
    return { success: false, error: error.message };
  }

  // Regla del proyecto: detectar 0 filas (RLS silencioso o id inválido).
  if (!updated || updated.length === 0) {
    return {
      success: false,
      error: "No pudimos revocar la cartola (no existe o ya fue revocada).",
    };
  }

  const petId = updated[0].pet_id;
  revalidatePath(`/tutor/${clinicSlug}/pets/${petId}`);
  return { success: true };
}

/**
 * Lista las cartolas (activas + históricas) de una mascota del tutor.
 */
export async function listHealthCards(
  input: { petId: string }
): Promise<ListCardsResult> {
  const parsed = listCardsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data, error } = await supabase
    .from("pet_health_cards")
    .select(
      "id, token, created_at, expires_at, revoked_at, view_count, last_viewed_at"
    )
    .eq("pet_id", parsed.data.petId)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  const base = await publicBaseUrl();
  const cards: HealthCardSummary[] = (data ?? []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    viewCount: row.view_count,
    lastViewedAt: row.last_viewed_at,
    status: computeStatus(row.expires_at, row.revoked_at),
    url: `${base}/c/${row.token}`,
  }));

  return { success: true, data: cards };
}
