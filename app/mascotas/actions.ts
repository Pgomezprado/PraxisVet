"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const addFirstPetSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre a tu mascota"),
  species: z.enum(["canino", "felino", "exotico"], {
    message: "Selecciona la especie",
  }),
  breed: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  birthdate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  tutor_first_name: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  tutor_last_name: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type AddFirstPetInput = z.input<typeof addFirstPetSchema>;
export type AddFirstPetResult =
  | { success: true; petId: string }
  | { success: false; error: string };

export async function addFirstPet(
  input: AddFirstPetInput
): Promise<AddFirstPetResult> {
  const parsed = addFirstPetSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Inicia sesión para registrar tu mascota" };
  }

  // 1. Garantizar la org personal del tutor (idempotente).
  const fallbackFirst =
    data.tutor_first_name ?? user.email?.split("@")[0] ?? "Tutor";
  const { data: ensured, error: ensureError } = await supabase.rpc(
    "ensure_personal_org_for_tutor",
    {
      p_first_name: fallbackFirst,
      p_last_name: data.tutor_last_name ?? "",
    }
  );

  if (ensureError || !ensured || ensured.length === 0) {
    console.error("[addFirstPet] ensure_personal_org error", ensureError);
    return {
      success: false,
      error: "No pudimos preparar tu espacio. Intenta de nuevo en un momento.",
    };
  }

  const { org_id, client_id } = ensured[0] as {
    org_id: string;
    client_id: string;
  };

  // 2. Insertar la mascota en la org personal del tutor.
  const { data: petRow, error: petError } = await supabase
    .from("pets")
    .insert({
      org_id,
      client_id,
      name: data.name,
      species: data.species,
      breed: data.breed ?? null,
      birthdate: data.birthdate ?? null,
      active: true,
    })
    .select("id")
    .single();

  if (petError || !petRow) {
    console.error("[addFirstPet] insert pet error", petError);
    return {
      success: false,
      error:
        petError?.code === "23505"
          ? "Ya tienes una mascota con ese nombre."
          : "No pudimos guardar a tu mascota. Intenta de nuevo.",
    };
  }

  revalidatePath("/mascotas");
  revalidatePath("/mascotas/salud");
  revalidatePath("/mascotas/belleza");

  return { success: true, petId: petRow.id };
}

// ============================================================================
// Registros manuales (modo "tutor sin clínica")
// ----------------------------------------------------------------------------
// Estos endpoints solo permiten agregar vacunas y desparasitaciones a mascotas
// que viven en la org PERSONAL del tutor. Las mascotas de clínicas reales
// solo pueden ser editadas desde la clínica — eso es invariante del proyecto.
// ============================================================================

const manualVaccinationSchema = z.object({
  pet_id: z.string().uuid(),
  vaccine_name: z.string().trim().min(1, "Indica qué vacuna"),
  date_administered: z.string().min(1, "Indica la fecha de aplicación"),
  next_due_date: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

const manualDewormingSchema = z.object({
  pet_id: z.string().uuid(),
  type: z.enum(["interna", "externa"], {
    message: "Selecciona el tipo",
  }),
  product: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  date_administered: z.string().min(1, "Indica la fecha de aplicación"),
  next_due_date: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type ManualMutationResult =
  | { success: true }
  | { success: false; error: string };

async function assertPersonalPet(
  supabase: Awaited<ReturnType<typeof createClient>>,
  petId: string
): Promise<{ ok: true; orgId: string } | { ok: false; error: string }> {
  const { data: row, error } = await supabase
    .from("pets")
    .select("id, org_id, organizations!inner ( is_personal )")
    .eq("id", petId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "No encontramos a tu mascota" };
  }

  type Row = {
    org_id: string;
    organizations: { is_personal: boolean } | null;
  };
  const r = row as unknown as Row;
  if (!r.organizations?.is_personal) {
    return {
      ok: false,
      error:
        "Esta mascota está en una clínica conectada. Pídele a tu vet que registre las vacunas.",
    };
  }
  return { ok: true, orgId: r.org_id };
}

// ============================================================================
// Lista de espera del hub (Mall, Viajes, Protección, Comunidad)
// ============================================================================

const waitlistSchema = z.object({
  section: z.enum(["mall", "viajes", "proteccion", "comunidad"]),
  email: z.string().trim().email("Ingresa un email válido"),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  notes: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  pet_species: z
    .enum(["canino", "felino", "exotico"])
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type JoinWaitlistInput = z.input<typeof waitlistSchema>;
export type JoinWaitlistResult =
  | { success: true; was_new: boolean }
  | { success: false; error: string };

// ============================================================================
// Loops de viralidad — tracking
// ============================================================================

const shareEventSchema = z.object({
  kind: z.enum(["share_with_vet", "invite_tutor"]),
  channel: z
    .enum(["whatsapp", "copy", "native_share", "email"])
    .optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type RecordShareEventInput = z.input<typeof shareEventSchema>;

export async function recordShareEvent(
  input: RecordShareEventInput
): Promise<{ success: boolean }> {
  const parsed = shareEventSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_hub_share_event", {
    p_kind: data.kind,
    p_channel: data.channel ?? null,
    p_context: data.context ?? {},
  });

  if (error) {
    console.error("[recordShareEvent] rpc error", error);
    return { success: false };
  }
  return { success: true };
}

export async function joinHubWaitlist(
  input: JoinWaitlistInput
): Promise<JoinWaitlistResult> {
  const parsed = waitlistSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { data: row, error } = await supabase.rpc("join_hub_waitlist", {
    p_section: data.section,
    p_email: data.email,
    p_phone: data.phone ?? null,
    p_notes: data.notes ?? null,
    p_pet_species: data.pet_species ?? null,
  });

  if (error) {
    console.error("[joinHubWaitlist] rpc error", error);
    return {
      success: false,
      error: "No pudimos guardar tu correo. Intenta de nuevo.",
    };
  }

  type Row = { id: string; was_new: boolean };
  const result = (row as unknown as Row[] | null)?.[0];

  return { success: true, was_new: result?.was_new ?? false };
}

export async function addManualVaccination(
  input: z.input<typeof manualVaccinationSchema>
): Promise<ManualMutationResult> {
  const parsed = manualVaccinationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Inicia sesión" };

  const guard = await assertPersonalPet(supabase, data.pet_id);
  if (!guard.ok) return { success: false, error: guard.error };

  const { error } = await supabase.from("vaccinations").insert({
    org_id: guard.orgId,
    pet_id: data.pet_id,
    vaccine_name: data.vaccine_name,
    date_administered: data.date_administered,
    next_due_date: data.next_due_date ?? null,
    notes: data.notes ?? null,
  });

  if (error) {
    console.error("[addManualVaccination] insert error", error);
    return { success: false, error: "No pudimos guardar la vacuna" };
  }

  revalidatePath(`/mascotas/${data.pet_id}`);
  revalidatePath("/mascotas/salud");
  return { success: true };
}

// ============================================================================
// Perfil enriquecido (modo personal)
// ============================================================================

const tutorProfileSchema = z
  .object({
    nickname: z.string().trim().max(60).optional().or(z.literal("")),
    personality: z.string().trim().max(500).optional().or(z.literal("")),
    food_brand: z.string().trim().max(120).optional().or(z.literal("")),
    food_notes: z.string().trim().max(500).optional().or(z.literal("")),
    favorite_toy: z.string().trim().max(120).optional().or(z.literal("")),
    favorite_treat: z.string().trim().max(120).optional().or(z.literal("")),
    walk_routine: z.string().trim().max(500).optional().or(z.literal("")),
    allergies: z.string().trim().max(500).optional().or(z.literal("")),
    likes: z.string().trim().max(500).optional().or(z.literal("")),
    dislikes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .partial();

export type TutorProfile = z.infer<typeof tutorProfileSchema>;

const updatePersonalPetSchema = z.object({
  pet_id: z.string().uuid(),
  name: z.string().trim().min(1).optional(),
  breed: z.string().trim().optional().or(z.literal("")),
  birthdate: z.string().trim().optional().or(z.literal("")),
  photo_url: z.string().url().nullable().optional(),
  tutor_profile: tutorProfileSchema.optional(),
});

export async function updatePersonalPet(
  input: z.input<typeof updatePersonalPetSchema>
): Promise<ManualMutationResult> {
  const parsed = updatePersonalPetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Inicia sesión" };

  const guard = await assertPersonalPet(supabase, data.pet_id);
  if (!guard.ok) return { success: false, error: guard.error };

  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.breed !== undefined) update.breed = data.breed === "" ? null : data.breed;
  if (data.birthdate !== undefined)
    update.birthdate = data.birthdate === "" ? null : data.birthdate;
  if (data.photo_url !== undefined) update.photo_url = data.photo_url;
  if (data.tutor_profile !== undefined) {
    // Limpiamos strings vacíos para no guardar basura.
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(data.tutor_profile)) {
      if (typeof value === "string" && value.trim().length > 0) {
        cleaned[key] = value.trim();
      }
    }
    update.tutor_profile = cleaned;
  }

  if (Object.keys(update).length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from("pets")
    .update(update)
    .eq("id", data.pet_id)
    .select("id")
    .single();

  if (error) {
    console.error("[updatePersonalPet] update error", error);
    return { success: false, error: "No pudimos guardar los cambios" };
  }

  revalidatePath(`/mascotas/${data.pet_id}`);
  revalidatePath("/mascotas/salud");
  return { success: true };
}

export async function addManualDeworming(
  input: z.input<typeof manualDewormingSchema>
): Promise<ManualMutationResult> {
  const parsed = manualDewormingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Inicia sesión" };

  const guard = await assertPersonalPet(supabase, data.pet_id);
  if (!guard.ok) return { success: false, error: guard.error };

  const { error } = await supabase.from("dewormings").insert({
    org_id: guard.orgId,
    pet_id: data.pet_id,
    type: data.type,
    product: data.product ?? null,
    date_administered: data.date_administered,
    next_due_date: data.next_due_date ?? null,
  });

  if (error) {
    console.error("[addManualDeworming] insert error", error);
    return { success: false, error: "No pudimos guardar la desparasitación" };
  }

  revalidatePath(`/mascotas/${data.pet_id}`);
  revalidatePath("/mascotas/salud");
  return { success: true };
}
