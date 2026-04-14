"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  vaccinationSchema,
  type VaccinationInput,
} from "@/lib/validations/vaccinations";
import type { Vaccination, OrganizationMember } from "@/types";
import { validateMemberInOrg } from "@/lib/auth/validate-member";

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
    return { success: false, error: error.message };
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
  input: VaccinationInput
): Promise<ActionResult<Vaccination>> {
  const parsed = vaccinationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos" };
  }

  const { supabase } = await getAuthUser();

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
      next_due_date: parsed.data.next_due_date || null,
      vet_id: parsed.data.vet_id || null,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Vaccination };
}

export async function updateVaccination(
  vaccinationId: string,
  input: VaccinationInput
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
    })
    .eq("id", vaccinationId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Vaccination };
}

export async function deleteVaccination(
  vaccinationId: string
): Promise<ActionResult> {
  const { supabase } = await getAuthUser();

  const { error } = await supabase
    .from("vaccinations")
    .delete()
    .eq("id", vaccinationId);

  if (error) {
    return { success: false, error: error.message };
  }

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
    return { success: false, error: error.message };
  }

  return { success: true, data: data ?? [] };
}
