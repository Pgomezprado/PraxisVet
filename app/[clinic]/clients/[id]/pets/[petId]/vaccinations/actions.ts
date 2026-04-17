"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  vaccinationSchema,
  type VaccinationInput,
} from "@/lib/validations/vaccinations";
import type { Vaccination, OrganizationMember } from "@/types";
import { validateMemberInOrg } from "@/lib/auth/validate-member";
import { formatSupabaseError } from "@/lib/errors/format-supabase-error";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getAuthUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

function revalidateVaccinations(basePath?: string) {
  if (basePath) revalidatePath(basePath);
}

export interface VaccinationWithVet extends Vaccination {
  vet_first_name: string | null;
  vet_last_name: string | null;
}

export async function getVaccinations(
  petId: string
): Promise<ActionResult<VaccinationWithVet[]>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("vaccinations")
    .select(
      `
      *,
      organization_members!vaccinations_vet_id_fkey (
        first_name,
        last_name
      )
    `
    )
    .eq("pet_id", petId)
    .order("date_administered", { ascending: false });

  if (error) {
    return { success: false, error: formatSupabaseError(error) };
  }

  const vaccinations = (data ?? []).map((v) => {
    const member = v.organization_members as unknown as {
      first_name: string | null;
      last_name: string | null;
    } | null;
    const { organization_members: _, ...rest } = v;
    return {
      ...rest,
      vet_first_name: member?.first_name ?? null,
      vet_last_name: member?.last_name ?? null,
    } as VaccinationWithVet;
  });

  return { success: true, data: vaccinations };
}

export async function createVaccination(
  orgId: string,
  input: VaccinationInput,
  basePath?: string
): Promise<ActionResult<Vaccination>> {
  const parsed = vaccinationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos" };
  }

  const { supabase } = await getAuthUser();

  const { data: pet } = await supabase
    .from("pets")
    .select("org_id, species")
    .eq("id", parsed.data.pet_id)
    .maybeSingle();

  if (!pet || pet.org_id !== orgId) {
    return { success: false, error: "Mascota no válida" };
  }

  if (parsed.data.dose_id) {
    const { data: dose } = await supabase
      .from("vaccine_protocol_doses")
      .select(
        "id, protocol_id, vaccine_protocols!inner(id, vaccine_id, species)"
      )
      .eq("id", parsed.data.dose_id)
      .maybeSingle();

    if (!dose) {
      return { success: false, error: "Dosis no encontrada" };
    }

    const proto = dose.vaccine_protocols as unknown as {
      id: string;
      vaccine_id: string;
      species: string;
    };

    if (parsed.data.protocol_id && parsed.data.protocol_id !== proto.id) {
      return {
        success: false,
        error: "Protocolo inconsistente con la dosis",
      };
    }
    if (
      parsed.data.vaccine_catalog_id &&
      parsed.data.vaccine_catalog_id !== proto.vaccine_id
    ) {
      return {
        success: false,
        error: "Vacuna inconsistente con el protocolo",
      };
    }
    if (pet.species && pet.species !== proto.species) {
      return {
        success: false,
        error: "La dosis no aplica para la especie de la mascota",
      };
    }
  }

  if (parsed.data.vet_id) {
    const memberCheck = await validateMemberInOrg(
      supabase,
      parsed.data.vet_id,
      orgId
    );
    if (!memberCheck.ok) {
      return { success: false, error: memberCheck.error };
    }
  }

  const { data, error } = await supabase
    .from("vaccinations")
    .insert({
      org_id: orgId,
      pet_id: parsed.data.pet_id,
      clinical_record_id: parsed.data.clinical_record_id || null,
      vaccine_name: parsed.data.vaccine_name,
      lot_number: parsed.data.lot_number || null,
      date_administered: parsed.data.date_administered,
      // Si viene dose_id, el trigger SQL recalcula next_due_date automáticamente.
      next_due_date: parsed.data.next_due_date || null,
      vet_id: parsed.data.vet_id || null,
      notes: parsed.data.notes || null,
      vaccine_catalog_id: parsed.data.vaccine_catalog_id || null,
      protocol_id: parsed.data.protocol_id || null,
      dose_id: parsed.data.dose_id || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: formatSupabaseError(error) };
  }

  revalidateVaccinations(basePath);
  return { success: true, data: data as Vaccination };
}

export async function updateVaccination(
  vaccinationId: string,
  input: VaccinationInput,
  basePath?: string
): Promise<ActionResult<Vaccination>> {
  const parsed = vaccinationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos" };
  }

  const { supabase } = await getAuthUser();

  const { data: existingVax } = await supabase
    .from("vaccinations")
    .select("org_id")
    .eq("id", vaccinationId)
    .maybeSingle();

  if (!existingVax) {
    return { success: false, error: "Vacunacion no encontrada" };
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("org_id, species")
    .eq("id", parsed.data.pet_id)
    .maybeSingle();

  if (!pet || pet.org_id !== existingVax.org_id) {
    return { success: false, error: "Mascota no válida" };
  }

  if (parsed.data.dose_id) {
    const { data: dose } = await supabase
      .from("vaccine_protocol_doses")
      .select(
        "id, protocol_id, vaccine_protocols!inner(id, vaccine_id, species)"
      )
      .eq("id", parsed.data.dose_id)
      .maybeSingle();

    if (!dose) {
      return { success: false, error: "Dosis no encontrada" };
    }

    const proto = dose.vaccine_protocols as unknown as {
      id: string;
      vaccine_id: string;
      species: string;
    };

    if (parsed.data.protocol_id && parsed.data.protocol_id !== proto.id) {
      return {
        success: false,
        error: "Protocolo inconsistente con la dosis",
      };
    }
    if (
      parsed.data.vaccine_catalog_id &&
      parsed.data.vaccine_catalog_id !== proto.vaccine_id
    ) {
      return {
        success: false,
        error: "Vacuna inconsistente con el protocolo",
      };
    }
    if (pet.species && pet.species !== proto.species) {
      return {
        success: false,
        error: "La dosis no aplica para la especie de la mascota",
      };
    }
  }

  if (parsed.data.vet_id) {
    const memberCheck = await validateMemberInOrg(
      supabase,
      parsed.data.vet_id,
      existingVax.org_id
    );
    if (!memberCheck.ok) {
      return { success: false, error: memberCheck.error };
    }
  }

  const { data, error } = await supabase
    .from("vaccinations")
    .update({
      vaccine_name: parsed.data.vaccine_name,
      lot_number: parsed.data.lot_number || null,
      date_administered: parsed.data.date_administered,
      next_due_date: parsed.data.next_due_date || null,
      vet_id: parsed.data.vet_id || null,
      notes: parsed.data.notes || null,
      clinical_record_id: parsed.data.clinical_record_id || null,
      vaccine_catalog_id: parsed.data.vaccine_catalog_id || null,
      protocol_id: parsed.data.protocol_id || null,
      dose_id: parsed.data.dose_id || null,
    })
    .eq("id", vaccinationId)
    .select()
    .single();

  if (error) {
    return { success: false, error: formatSupabaseError(error) };
  }

  revalidateVaccinations(basePath);
  return { success: true, data: data as Vaccination };
}

export async function deleteVaccination(
  vaccinationId: string,
  basePath?: string
): Promise<ActionResult> {
  const { supabase } = await getAuthUser();

  const { data: existing } = await supabase
    .from("vaccinations")
    .select("id")
    .eq("id", vaccinationId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Vacunación no encontrada" };
  }

  const { error } = await supabase
    .from("vaccinations")
    .delete()
    .eq("id", vaccinationId);

  if (error) {
    return { success: false, error: formatSupabaseError(error) };
  }

  revalidateVaccinations(basePath);
  return { success: true, data: undefined };
}

export async function getVets(
  orgId: string
): Promise<ActionResult<Pick<OrganizationMember, "id" | "first_name" | "last_name">[]>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("organization_members")
    .select("id, first_name, last_name")
    .eq("org_id", orgId)
    .eq("active", true)
    .in("role", ["admin", "vet"])
    .order("last_name", { ascending: true });

  if (error) {
    return { success: false, error: formatSupabaseError(error) };
  }

  return { success: true, data: data ?? [] };
}
