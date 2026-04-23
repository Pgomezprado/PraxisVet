"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  serviceSchema,
  servicePriceTierSchema,
  type ServiceInput,
  type ServicePriceTierInput,
} from "@/lib/validations/services";
import type { Service, ServicePriceTier, PetSize, Species } from "@/types";

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

export async function getServices(
  orgId: string
): Promise<ActionResult<Service[]>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as Service[] };
}

export async function getService(
  serviceId: string
): Promise<ActionResult<Service>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Service };
}

export async function createService(
  orgId: string,
  clinicSlug: string,
  formData: ServiceInput
): Promise<ActionResult<Service>> {
  const parsed = serviceSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("services")
    .insert({
      org_id: orgId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      category: parsed.data.category || null,
      duration_minutes: parsed.data.duration_minutes,
      price: parsed.data.price ?? null,
      active: parsed.data.active,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/settings/services`, "page");
  return { success: true, data: data as Service };
}

export async function updateService(
  serviceId: string,
  clinicSlug: string,
  formData: ServiceInput
): Promise<ActionResult<Service>> {
  const parsed = serviceSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("services")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      category: parsed.data.category || null,
      duration_minutes: parsed.data.duration_minutes,
      price: parsed.data.price ?? null,
      active: parsed.data.active,
    })
    .eq("id", serviceId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/settings/services`, "page");
  return { success: true, data: data as Service };
}

export async function deleteService(
  serviceId: string,
  clinicSlug: string
): Promise<ActionResult> {
  const { supabase } = await getAuthUser();

  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("service_id", serviceId);

  if (count && count > 0) {
    const { error } = await supabase
      .from("services")
      .update({ active: false })
      .eq("id", serviceId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/${clinicSlug}/settings/services`, "page");
    return { success: true, data: undefined };
  }

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/settings/services`, "page");
  return { success: true, data: undefined };
}

export async function toggleServiceActive(
  serviceId: string,
  currentActive: boolean,
  clinicSlug: string
): Promise<ActionResult<Service>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("services")
    .update({ active: !currentActive })
    .eq("id", serviceId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/settings/services`, "page");
  return { success: true, data: data as Service };
}

// =====================================================
// Tarifas variables (Sprint 5 · Bloque 2)
// =====================================================

async function getServiceOrgId(
  serviceId: string
): Promise<{ ok: true; orgId: string } | { ok: false; error: string }> {
  const { supabase } = await getAuthUser();
  const { data } = await supabase
    .from("services")
    .select("org_id")
    .eq("id", serviceId)
    .maybeSingle();
  if (!data) return { ok: false, error: "Servicio no encontrado" };
  return { ok: true, orgId: data.org_id as string };
}

export async function listServicePriceTiers(
  serviceId: string
): Promise<ActionResult<ServicePriceTier[]>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("service_price_tiers")
    .select("*")
    .eq("service_id", serviceId)
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as ServicePriceTier[] };
}

function normalizeTierPayload(input: ServicePriceTierInput) {
  return {
    label: input.label.trim(),
    species_filter: input.species_filter || null,
    size: input.size || null,
    weight_min_kg: input.weight_min_kg ?? null,
    weight_max_kg: input.weight_max_kg ?? null,
    price: input.price,
    active: input.active,
  };
}

export async function createServicePriceTier(
  serviceId: string,
  clinicSlug: string,
  formData: ServicePriceTierInput
): Promise<ActionResult<ServicePriceTier>> {
  const parsed = servicePriceTierSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const guard = await getServiceOrgId(serviceId);
  if (!guard.ok) return { success: false, error: guard.error };

  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("service_price_tiers")
    .insert({
      org_id: guard.orgId,
      service_id: serviceId,
      ...normalizeTierPayload(parsed.data),
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/${clinicSlug}/settings/services/${serviceId}/edit`, "page");
  return { success: true, data: data as ServicePriceTier };
}

export async function updateServicePriceTier(
  tierId: string,
  serviceId: string,
  clinicSlug: string,
  formData: ServicePriceTierInput
): Promise<ActionResult<ServicePriceTier>> {
  const parsed = servicePriceTierSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("service_price_tiers")
    .update(normalizeTierPayload(parsed.data))
    .eq("id", tierId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  if (!data)
    return {
      success: false,
      error: "El tier no existe o no pertenece a esta clínica",
    };

  revalidatePath(`/${clinicSlug}/settings/services/${serviceId}/edit`, "page");
  return { success: true, data: data as ServicePriceTier };
}

export async function deleteServicePriceTier(
  tierId: string,
  serviceId: string,
  clinicSlug: string
): Promise<ActionResult> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("service_price_tiers")
    .delete()
    .eq("id", tierId)
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      success: false,
      error: "El tier no existe o ya fue eliminado",
    };
  }

  revalidatePath(`/${clinicSlug}/settings/services/${serviceId}/edit`, "page");
  return { success: true, data: undefined };
}

/**
 * Resuelve el precio de un servicio para una mascota concreta.
 *
 * Estrategia: cargar tiers activos del servicio, calcular un score por tier
 * (más alto = más específico) y devolver el precio del tier ganador. Si no
 * matchea ninguno, retorna el `services.price` base.
 *
 * Score:
 *   +3 si species_filter coincide con pet.species
 *   +3 si size coincide con pet.size
 *   +2 si weight_kg cae dentro de [weight_min_kg, weight_max_kg]
 *   tiers que NO matchean (species/size distintos al pet) se descartan
 */
export type ResolvedPrice = {
  price: number;
  source: "tier" | "service" | "none";
  tier_id: string | null;
  tier_label: string | null;
};

export async function resolvePriceForPet(
  serviceId: string,
  petId: string
): Promise<ActionResult<ResolvedPrice>> {
  const { supabase } = await getAuthUser();

  const [{ data: service }, { data: pet }, { data: tiers }] = await Promise.all([
    supabase
      .from("services")
      .select("id, price")
      .eq("id", serviceId)
      .maybeSingle(),
    supabase
      .from("pets")
      .select("id, species, size, weight")
      .eq("id", petId)
      .maybeSingle(),
    supabase
      .from("service_price_tiers")
      .select("*")
      .eq("service_id", serviceId)
      .eq("active", true),
  ]);

  if (!service) return { success: false, error: "Servicio no encontrado" };
  if (!pet) return { success: false, error: "Mascota no encontrada" };

  const petSpecies = pet.species as Species | null;
  const petSize = pet.size as PetSize | null;
  const petWeight = pet.weight !== null ? Number(pet.weight) : null;

  let bestTier: ServicePriceTier | null = null;
  let bestScore = -1;

  for (const raw of (tiers ?? []) as ServicePriceTier[]) {
    let score = 0;

    if (raw.species_filter) {
      if (petSpecies !== raw.species_filter) continue;
      score += 3;
    }

    if (raw.size) {
      if (petSize !== raw.size) continue;
      score += 3;
    }

    const hasWeightRange =
      raw.weight_min_kg !== null || raw.weight_max_kg !== null;
    if (hasWeightRange) {
      if (petWeight === null) continue;
      if (
        raw.weight_min_kg !== null &&
        petWeight < Number(raw.weight_min_kg)
      )
        continue;
      if (
        raw.weight_max_kg !== null &&
        petWeight > Number(raw.weight_max_kg)
      )
        continue;
      score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTier = raw;
    }
  }

  if (bestTier) {
    return {
      success: true,
      data: {
        price: Number(bestTier.price),
        source: "tier",
        tier_id: bestTier.id,
        tier_label: bestTier.label,
      },
    };
  }

  if (service.price !== null) {
    return {
      success: true,
      data: {
        price: Number(service.price),
        source: "service",
        tier_id: null,
        tier_label: null,
      },
    };
  }

  return {
    success: true,
    data: {
      price: 0,
      source: "none",
      tier_id: null,
      tier_label: null,
    },
  };
}
