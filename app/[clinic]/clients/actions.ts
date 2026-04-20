"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  clientSchema,
  petSchema,
  newTutorWithPetSchema,
  type ClientInput,
  type PetInput,
  type NewTutorWithPetInput,
} from "@/lib/validations/clients";
import type { Client, Pet } from "@/types";
import { escapePostgrestSearch } from "@/lib/utils/search";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ClientPetPreview = Pick<Pet, "id" | "name" | "species">;

export interface ClientWithPetsPreview extends Client {
  pet_count: number;
  pets_preview: ClientPetPreview[];
}

async function getAuthUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function getClients(
  orgId: string,
  options?: { page?: number; pageSize?: number; search?: string }
): Promise<
  ActionResult<{ data: ClientWithPetsPreview[]; total: number }>
> {
  const { supabase } = await getAuthUser();

  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 25;
  const search = options?.search?.trim() ?? "";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("clients")
    .select(
      "*, pets(id, active), pets_preview:pets(id, name, species, active, created_at)",
      { count: "exact", head: false }
    )
    .eq("org_id", orgId)
    .order("last_name", { ascending: true })
    .order("created_at", {
      ascending: true,
      referencedTable: "pets_preview",
    })
    .limit(4, { referencedTable: "pets_preview" });

  if (search) {
    const safe = escapePostgrestSearch(search);
    if (safe) {
      const { data: matchingPets } = await supabase
        .from("pets")
        .select("client_id")
        .eq("org_id", orgId)
        .ilike("name", `%${safe}%`);

      const petClientIds = Array.from(
        new Set(
          (matchingPets ?? []).map((p: { client_id: string }) => p.client_id)
        )
      ).slice(0, 500);

      const baseOr = `first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`;
      const orExpr =
        petClientIds.length > 0
          ? `${baseOr},id.in.(${petClientIds.join(",")})`
          : baseOr;

      query = query.or(orExpr);
    }
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  const clients: ClientWithPetsPreview[] = (data ?? []).map((client) => {
    const { pets, pets_preview, ...rest } = client as typeof client & {
      pets: { id: string; active: boolean }[] | null;
      pets_preview:
        | (ClientPetPreview & { active: boolean; created_at: string })[]
        | null;
    };

    const allPets = Array.isArray(pets) ? pets : [];
    const pet_count = allPets.filter((p) => p.active !== false).length;

    const preview = Array.isArray(pets_preview) ? pets_preview : [];
    const pets_preview_active: ClientPetPreview[] = preview
      .filter((p) => p.active !== false)
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        name: p.name,
        species: p.species,
      }));

    return {
      ...(rest as Client),
      pet_count,
      pets_preview: pets_preview_active,
    };
  });

  return { success: true, data: { data: clients, total: count ?? 0 } };
}

export async function getClient(
  clientId: string
): Promise<ActionResult<Client & { pets: Pet[] }>> {
  const { supabase } = await getAuthUser();

  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (error || !client) {
    return { success: false, error: "Cliente no encontrado" };
  }

  const { data: pets } = await supabase
    .from("pets")
    .select("*")
    .eq("client_id", clientId)
    .order("name", { ascending: true });

  return {
    success: true,
    data: { ...client, pets: pets ?? [] } as Client & { pets: Pet[] },
  };
}

export async function createClient(
  orgId: string,
  clinicSlug: string,
  input: ClientInput
): Promise<ActionResult<Client>> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos" };
  }

  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("clients")
    .insert({
      org_id: orgId,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/clients`);
  return { success: true, data: data as Client };
}

/**
 * Crea un tutor y su primer paciente en una sola operación.
 * Si falla la creación del paciente, elimina el tutor recién creado
 * para no dejar tutores huérfanos sin mascotas.
 */
export async function createTutorWithPet(
  orgId: string,
  clinicSlug: string,
  input: NewTutorWithPetInput
): Promise<ActionResult<{ clientId: string; petId: string }>> {
  const parsed = newTutorWithPetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase } = await getAuthUser();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      org_id: orgId,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (clientError || !client) {
    return {
      success: false,
      error: clientError?.message || "No se pudo crear el tutor",
    };
  }

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .insert({
      org_id: orgId,
      client_id: client.id,
      name: parsed.data.pet_name,
      species: parsed.data.pet_species || null,
      breed: parsed.data.pet_breed || null,
      color: parsed.data.pet_color || null,
      sex: parsed.data.pet_sex || null,
      birthdate: parsed.data.pet_birthdate || null,
      microchip: parsed.data.pet_microchip || null,
      reproductive_status: parsed.data.pet_reproductive_status || null,
      notes: parsed.data.pet_notes || null,
      photo_url: parsed.data.pet_photo_url ?? null,
    })
    .select("id")
    .single();

  if (petError || !pet) {
    // Rollback: eliminar el cliente recién creado para no dejar tutores huérfanos
    await supabase.from("clients").delete().eq("id", client.id);
    return {
      success: false,
      error:
        petError?.message ||
        "No se pudo crear el paciente. Se canceló la creación del tutor.",
    };
  }

  revalidatePath(`/${clinicSlug}/clients`);
  return { success: true, data: { clientId: client.id, petId: pet.id } };
}

export async function updateClient(
  clientId: string,
  clinicSlug: string,
  input: ClientInput
): Promise<ActionResult<Client>> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos" };
  }

  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("clients")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", clientId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/clients`);
  revalidatePath(`/${clinicSlug}/clients/${clientId}`);
  return { success: true, data: data as Client };
}

export async function deleteClient(
  clientId: string,
  clinicSlug: string
): Promise<ActionResult> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId)
    .select("id");

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return {
      success: false,
      error:
        "No se pudo eliminar el cliente. Solo administradores pueden eliminar clientes (borra mascotas y todo su historial).",
    };
  }

  revalidatePath(`/${clinicSlug}/clients`);
  return { success: true, data: undefined };
}

export async function createPet(
  orgId: string,
  clientId: string,
  clinicSlug: string,
  input: PetInput
): Promise<ActionResult<Pet>> {
  const parsed = petSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos" };
  }

  const { supabase } = await getAuthUser();

  const { data: tutor, error: tutorError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (tutorError) return { success: false, error: tutorError.message };
  if (!tutor) return { success: false, error: "Tutor no pertenece a esta clinica" };

  const { data, error } = await supabase
    .from("pets")
    .insert({
      org_id: orgId,
      client_id: clientId,
      name: parsed.data.name,
      species: parsed.data.species || null,
      breed: parsed.data.breed || null,
      color: parsed.data.color || null,
      sex: parsed.data.sex || null,
      birthdate: parsed.data.birthdate || null,
      microchip: parsed.data.microchip || null,
      reproductive_status: parsed.data.reproductive_status || null,
      notes: parsed.data.notes || null,
      photo_url: parsed.data.photo_url ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: `Ya existe un paciente llamado "${parsed.data.name}" para este tutor.`,
      };
    }
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/clients/${clientId}`);
  revalidatePath(`/${clinicSlug}/clients`);
  return { success: true, data: data as Pet };
}

export async function updatePet(
  orgId: string,
  petId: string,
  clientId: string,
  clinicSlug: string,
  input: PetInput
): Promise<ActionResult<Pet>> {
  const parsed = petSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos" };
  }

  const { supabase } = await getAuthUser();

  const { data: existing, error: existingError } = await supabase
    .from("pets")
    .select("id, client_id")
    .eq("id", petId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (existingError) return { success: false, error: existingError.message };
  if (!existing) return { success: false, error: "Paciente no pertenece a esta clinica" };
  if (existing.client_id !== clientId) {
    return { success: false, error: "Paciente no pertenece al tutor indicado" };
  }

  const { data, error } = await supabase
    .from("pets")
    .update({
      name: parsed.data.name,
      species: parsed.data.species || null,
      breed: parsed.data.breed || null,
      color: parsed.data.color || null,
      sex: parsed.data.sex || null,
      birthdate: parsed.data.birthdate || null,
      microchip: parsed.data.microchip || null,
      reproductive_status: parsed.data.reproductive_status || null,
      notes: parsed.data.notes || null,
      photo_url: parsed.data.photo_url ?? null,
    })
    .eq("id", petId)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: `Ya existe un paciente llamado "${parsed.data.name}" para este tutor.`,
      };
    }
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/clients/${clientId}`);
  return { success: true, data: data as Pet };
}

export async function checkPetNameExists(
  orgId: string,
  clientId: string,
  name: string,
  excludePetId?: string
): Promise<ActionResult<{ pet: { id: string; name: string } | null }>> {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { success: true, data: { pet: null } };
  }

  const { supabase } = await getAuthUser();

  let query = supabase
    .from("pets")
    .select("id, name")
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .eq("active", true)
    .ilike("name", trimmed)
    .limit(1);

  if (excludePetId) {
    query = query.neq("id", excludePetId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: { pet: data ?? null } };
}

export async function deletePet(
  orgId: string,
  petId: string,
  clientId: string,
  clinicSlug: string
): Promise<ActionResult> {
  const { supabase } = await getAuthUser();

  const { data: existing, error: existingError } = await supabase
    .from("pets")
    .select("id, client_id")
    .eq("id", petId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (existingError) return { success: false, error: existingError.message };
  if (!existing) return { success: false, error: "Paciente no pertenece a esta clinica" };
  if (existing.client_id !== clientId) {
    return { success: false, error: "Paciente no pertenece al tutor indicado" };
  }

  const { error } = await supabase
    .from("pets")
    .delete()
    .eq("id", petId)
    .eq("org_id", orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/clients/${clientId}`);
  revalidatePath(`/${clinicSlug}/clients`);
  return { success: true, data: undefined };
}
