"use server";

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
