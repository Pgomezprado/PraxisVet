"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  prescriptionSchema,
  type PrescriptionInput,
} from "@/lib/validations/prescriptions";
import type { Prescription } from "@/types";

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

export async function getPrescriptions(
  recordId: string
): Promise<ActionResult<Prescription[]>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("prescriptions")
    .select("*")
    .eq("clinical_record_id", recordId)
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as Prescription[] };
}

export async function createPrescription(
  orgId: string,
  clinicSlug: string,
  input: PrescriptionInput
): Promise<ActionResult<Prescription>> {
  const parsed = prescriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos" };
  }

  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("prescriptions")
    .insert({
      org_id: orgId,
      clinical_record_id: parsed.data.clinical_record_id,
      medication: parsed.data.medication,
      dose: parsed.data.dose || null,
      frequency: parsed.data.frequency || null,
      duration: parsed.data.duration || null,
      notes: parsed.data.notes || null,
      is_retained: parsed.data.is_retained ?? false,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}`);
  return { success: true, data: data as Prescription };
}

export async function updatePrescription(
  prescriptionId: string,
  clinicSlug: string,
  input: Omit<PrescriptionInput, "clinical_record_id">
): Promise<ActionResult<Prescription>> {
  const partialSchema = prescriptionSchema.omit({ clinical_record_id: true });
  const parsed = partialSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos" };
  }

  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("prescriptions")
    .update({
      medication: parsed.data.medication,
      dose: parsed.data.dose || null,
      frequency: parsed.data.frequency || null,
      duration: parsed.data.duration || null,
      notes: parsed.data.notes || null,
      is_retained: parsed.data.is_retained ?? false,
    })
    .eq("id", prescriptionId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}`);
  return { success: true, data: data as Prescription };
}

export async function deletePrescription(
  prescriptionId: string,
  clinicSlug: string
): Promise<ActionResult> {
  const { supabase } = await getAuthUser();

  const { error } = await supabase
    .from("prescriptions")
    .delete()
    .eq("id", prescriptionId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}`);
  return { success: true, data: undefined };
}
