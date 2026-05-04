"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  customBreedSchema,
  type CustomBreedInput,
} from "@/lib/validations/breeds";
import type { CustomBreed, Species } from "@/types";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function getCustomBreeds(
  orgId: string
): Promise<ActionResult<CustomBreed[]>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("custom_breeds")
    .select("*")
    .eq("org_id", orgId)
    .order("species", { ascending: true })
    .order("name", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as CustomBreed[] };
}

export async function getCustomBreedsBySpecies(
  orgId: string,
  species: Species
): Promise<string[]> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("custom_breeds")
    .select("name")
    .eq("org_id", orgId)
    .eq("species", species)
    .order("name", { ascending: true });

  if (error) return [];
  return (data ?? []).map((r) => r.name as string);
}

export async function getCustomBreedsGrouped(
  orgId: string
): Promise<Record<string, string[]>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("custom_breeds")
    .select("species, name")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error || !data) return {};

  const grouped: Record<string, string[]> = {};
  for (const row of data as { species: string; name: string }[]) {
    if (!grouped[row.species]) grouped[row.species] = [];
    grouped[row.species].push(row.name);
  }
  return grouped;
}

export async function createCustomBreed(
  orgId: string,
  clinicSlug: string,
  formData: CustomBreedInput
): Promise<ActionResult<CustomBreed>> {
  const parsed = customBreedSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await getAuthUser();

  const { data, error } = await supabase
    .from("custom_breeds")
    .insert({
      org_id: orgId,
      species: parsed.data.species,
      name: parsed.data.name,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "Esa raza ya está en el catálogo de la clínica.",
      };
    }
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/settings/breeds`, "page");
  return { success: true, data: data as CustomBreed };
}

export async function deleteCustomBreed(
  breedId: string,
  clinicSlug: string
): Promise<ActionResult> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("custom_breeds")
    .delete()
    .eq("id", breedId)
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      success: false,
      error: "No tienes permiso para eliminar esta raza o ya no existe.",
    };
  }

  revalidatePath(`/${clinicSlug}/settings/breeds`, "page");
  return { success: true, data: undefined };
}
