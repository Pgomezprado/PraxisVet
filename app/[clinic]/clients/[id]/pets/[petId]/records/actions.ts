"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  clinicalRecordSchema,
  type ClinicalRecordInput,
  type ClinicalRecordParsed,
} from "@/lib/validations/clinical-records";
import { validateMemberInOrg } from "@/lib/auth/validate-member";
import type { PhysicalExam } from "@/types";

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

export type RecordWithVet = {
  id: string;
  pet_id: string;
  appointment_id: string | null;
  date: string;
  reason: string | null;
  diagnosis: string | null;
  weight: number | null;
  temperature: number | null;
  heart_rate: number | null;
  heart_rate_unmeasurable: boolean;
  created_at: string;
  vet: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
};

export type RecordDetail = {
  id: string;
  org_id: string;
  pet_id: string;
  appointment_id: string | null;
  vet_id: string;
  date: string;
  reason: string | null;
  anamnesis: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  treatment: string | null;
  observations: string | null;
  weight: number | null;
  temperature: number | null;
  heart_rate: number | null;
  heart_rate_unmeasurable: boolean;
  heart_auscultation_status: "sin_hallazgos" | "con_hallazgos" | null;
  heart_auscultation_findings: string | null;
  respiratory_rate: number | null;
  respiratory_auscultation_status: "sin_hallazgos" | "con_hallazgos" | null;
  respiratory_auscultation_findings: string | null;
  capillary_refill_seconds: number | null;
  skin_fold_seconds: number | null;
  physical_exam: PhysicalExam | null;
  next_consultation_date: string | null;
  next_consultation_note: string | null;
  created_at: string;
  vet: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    specialty: string | null;
  };
  pet: {
    id: string;
    name: string;
    species: string | null;
    breed: string | null;
    client_id: string;
  };
  appointment: {
    id: string;
    date: string;
    start_time: string;
    reason: string | null;
  } | null;
};

export async function getRecords(
  petId: string
): Promise<ActionResult<RecordWithVet[]>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("clinical_records")
    .select(
      `
      id, pet_id, appointment_id, date, reason, diagnosis,
      weight, temperature, heart_rate, heart_rate_unmeasurable, created_at,
      vet:organization_members!vet_id (id, first_name, last_name)
    `
    )
    .eq("pet_id", petId)
    .order("date", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as unknown as RecordWithVet[] };
}

export async function getRecord(
  recordId: string
): Promise<ActionResult<RecordDetail>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("clinical_records")
    .select(
      `
      *,
      vet:organization_members!vet_id (id, first_name, last_name, specialty),
      pet:pets!pet_id (id, name, species, breed, client_id),
      appointment:appointments!appointment_id (id, date, start_time, reason)
    `
    )
    .eq("id", recordId)
    .single();

  if (error || !data) {
    return { success: false, error: "Registro clinico no encontrado" };
  }

  return { success: true, data: data as unknown as RecordDetail };
}

export async function createRecord(
  orgId: string,
  clinicSlug: string,
  clientId: string,
  input: ClinicalRecordInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = clinicalRecordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase } = await getAuthUser();

  const memberCheck = await validateMemberInOrg(
    supabase,
    parsed.data.vet_id,
    orgId
  );
  if (!memberCheck.ok) {
    return { success: false, error: memberCheck.error };
  }

  const { data, error } = await supabase
    .from("clinical_records")
    .insert({
      org_id: orgId,
      pet_id: parsed.data.pet_id,
      vet_id: parsed.data.vet_id,
      appointment_id: parsed.data.appointment_id || null,
      date: parsed.data.date,
      reason: parsed.data.reason || null,
      anamnesis: parsed.data.anamnesis || null,
      symptoms: parsed.data.symptoms || null,
      diagnosis: parsed.data.diagnosis || null,
      treatment: parsed.data.treatment || null,
      observations: parsed.data.observations || null,
      weight: parsed.data.weight ?? null,
      temperature: parsed.data.temperature ?? null,
      heart_rate: parsed.data.heart_rate_unmeasurable
        ? null
        : (parsed.data.heart_rate ?? null),
      heart_rate_unmeasurable: parsed.data.heart_rate_unmeasurable ?? false,
      heart_auscultation_status: parsed.data.heart_auscultation_status ?? null,
      heart_auscultation_findings:
        parsed.data.heart_auscultation_status === "con_hallazgos"
          ? (parsed.data.heart_auscultation_findings ?? null)
          : null,
      respiratory_rate: parsed.data.respiratory_rate ?? null,
      respiratory_auscultation_status:
        parsed.data.respiratory_auscultation_status ?? null,
      respiratory_auscultation_findings:
        parsed.data.respiratory_auscultation_status === "con_hallazgos"
          ? (parsed.data.respiratory_auscultation_findings ?? null)
          : null,
      capillary_refill_seconds: parsed.data.capillary_refill_seconds ?? null,
      skin_fold_seconds: parsed.data.skin_fold_seconds ?? null,
      physical_exam: parsed.data.physical_exam ?? null,
      next_consultation_date: parsed.data.next_consultation_date || null,
      next_consultation_note: parsed.data.next_consultation_note || null,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(
    `/${clinicSlug}/clients/${clientId}/pets/${parsed.data.pet_id}/records`
  );
  return { success: true, data: { id: data.id } };
}

export async function updateRecord(
  recordId: string,
  clinicSlug: string,
  clientId: string,
  petId: string,
  input: ClinicalRecordInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = clinicalRecordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase } = await getAuthUser();

  const { data: existing } = await supabase
    .from("clinical_records")
    .select("org_id")
    .eq("id", recordId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Registro clinico no encontrado" };
  }

  const memberCheck = await validateMemberInOrg(
    supabase,
    parsed.data.vet_id,
    existing.org_id
  );
  if (!memberCheck.ok) {
    return { success: false, error: memberCheck.error };
  }

  const { data, error } = await supabase
    .from("clinical_records")
    .update({
      vet_id: parsed.data.vet_id,
      appointment_id: parsed.data.appointment_id || null,
      date: parsed.data.date,
      reason: parsed.data.reason || null,
      anamnesis: parsed.data.anamnesis || null,
      symptoms: parsed.data.symptoms || null,
      diagnosis: parsed.data.diagnosis || null,
      treatment: parsed.data.treatment || null,
      observations: parsed.data.observations || null,
      weight: parsed.data.weight ?? null,
      temperature: parsed.data.temperature ?? null,
      heart_rate: parsed.data.heart_rate_unmeasurable
        ? null
        : (parsed.data.heart_rate ?? null),
      heart_rate_unmeasurable: parsed.data.heart_rate_unmeasurable ?? false,
      heart_auscultation_status: parsed.data.heart_auscultation_status ?? null,
      heart_auscultation_findings:
        parsed.data.heart_auscultation_status === "con_hallazgos"
          ? (parsed.data.heart_auscultation_findings ?? null)
          : null,
      respiratory_rate: parsed.data.respiratory_rate ?? null,
      respiratory_auscultation_status:
        parsed.data.respiratory_auscultation_status ?? null,
      respiratory_auscultation_findings:
        parsed.data.respiratory_auscultation_status === "con_hallazgos"
          ? (parsed.data.respiratory_auscultation_findings ?? null)
          : null,
      capillary_refill_seconds: parsed.data.capillary_refill_seconds ?? null,
      skin_fold_seconds: parsed.data.skin_fold_seconds ?? null,
      physical_exam: parsed.data.physical_exam ?? null,
      next_consultation_date: parsed.data.next_consultation_date || null,
      next_consultation_note: parsed.data.next_consultation_note || null,
    })
    .eq("id", recordId)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(
    `/${clinicSlug}/clients/${clientId}/pets/${petId}/records`
  );
  revalidatePath(
    `/${clinicSlug}/clients/${clientId}/pets/${petId}/records/${recordId}`
  );
  return { success: true, data: { id: data.id } };
}

export async function deleteRecord(
  recordId: string,
  clinicSlug: string,
  clientId: string,
  petId: string
): Promise<ActionResult> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("clinical_records")
    .delete()
    .eq("id", recordId)
    .select("id");

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return {
      success: false,
      error:
        "No se pudo eliminar el registro. Es posible que ya haya sido eliminado o que tu rol no tenga permisos.",
    };
  }

  revalidatePath(
    `/${clinicSlug}/clients/${clientId}/pets/${petId}/records`
  );
  return { success: true, data: undefined };
}

export async function getVets(orgId: string) {
  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("id, first_name, last_name, specialty")
    .eq("org_id", orgId)
    .eq("active", true)
    .in("role", ["admin", "vet"])
    .order("first_name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getPetWithClient(petId: string) {
  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("pets")
    .select(
      `
      id, name, species, breed, sex, birthdate, client_id,
      client:clients!client_id (id, first_name, last_name)
    `
    )
    .eq("id", petId)
    .single();

  if (error || !data) {
    return { data: null, error: "Mascota no encontrada" };
  }

  return { data: data as unknown as {
    id: string;
    name: string;
    species: string | null;
    breed: string | null;
    sex: string | null;
    birthdate: string | null;
    client_id: string;
    client: { id: string; first_name: string; last_name: string };
  }, error: null };
}

export async function getLinkedRecord(appointmentId: string) {
  const supabase = await createSupabaseClient();

  const { data } = await supabase
    .from("clinical_records")
    .select("id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  return data;
}
