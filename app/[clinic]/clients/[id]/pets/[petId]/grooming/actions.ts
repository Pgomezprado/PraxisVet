"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  groomingRecordSchema,
  type GroomingRecordInput,
} from "@/lib/validations/grooming-records";
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

export type GroomingRecordListItem = {
  id: string;
  pet_id: string;
  appointment_id: string | null;
  date: string;
  service_performed: string | null;
  observations: string | null;
  price: number | null;
  created_at: string;
  groomer: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
};

export type GroomingRecordDetail = {
  id: string;
  org_id: string;
  pet_id: string;
  appointment_id: string | null;
  groomer_id: string | null;
  date: string;
  service_performed: string | null;
  observations: string | null;
  price: number | null;
  created_at: string;
  groomer: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
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
  } | null;
};

export async function getGroomingRecords(
  petId: string
): Promise<ActionResult<GroomingRecordListItem[]>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("grooming_records")
    .select(
      `
      id, pet_id, appointment_id, date, service_performed, observations, price, created_at,
      groomer:organization_members!groomer_id (id, first_name, last_name)
    `
    )
    .eq("pet_id", petId)
    .order("date", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as unknown as GroomingRecordListItem[] };
}

export async function getGroomingRecord(
  recordId: string
): Promise<ActionResult<GroomingRecordDetail>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("grooming_records")
    .select(
      `
      *,
      groomer:organization_members!groomer_id (id, first_name, last_name),
      pet:pets!pet_id (id, name, species, breed, client_id),
      appointment:appointments!appointment_id (id, date, start_time)
    `
    )
    .eq("id", recordId)
    .single();

  if (error || !data) {
    return { success: false, error: "Registro de peluquería no encontrado" };
  }

  return { success: true, data: data as unknown as GroomingRecordDetail };
}

export async function createGroomingRecord(
  orgId: string,
  clinicSlug: string,
  clientId: string,
  input: GroomingRecordInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = groomingRecordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase } = await getAuthUser();

  if (parsed.data.groomer_id) {
    const memberCheck = await validateMemberInOrg(
      supabase,
      parsed.data.groomer_id,
      orgId
    );
    if (!memberCheck.ok) {
      return { success: false, error: memberCheck.error };
    }
  }

  const { data, error } = await supabase
    .from("grooming_records")
    .insert({
      org_id: orgId,
      pet_id: parsed.data.pet_id,
      groomer_id: parsed.data.groomer_id,
      appointment_id: parsed.data.appointment_id || null,
      date: parsed.data.date,
      service_performed: parsed.data.service_performed,
      observations: parsed.data.observations || null,
      price: parsed.data.price ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(
    `/${clinicSlug}/clients/${clientId}/pets/${parsed.data.pet_id}/grooming`
  );
  if (parsed.data.appointment_id) {
    revalidatePath(`/${clinicSlug}/appointments/${parsed.data.appointment_id}`);
  }
  return { success: true, data: { id: data.id } };
}

export async function updateGroomingRecord(
  recordId: string,
  clinicSlug: string,
  clientId: string,
  petId: string,
  input: GroomingRecordInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = groomingRecordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase } = await getAuthUser();

  const { data: existingGrooming } = await supabase
    .from("grooming_records")
    .select("org_id")
    .eq("id", recordId)
    .maybeSingle();

  if (!existingGrooming) {
    return { success: false, error: "Registro de peluqueria no encontrado" };
  }

  if (parsed.data.groomer_id) {
    const memberCheck = await validateMemberInOrg(
      supabase,
      parsed.data.groomer_id,
      existingGrooming.org_id
    );
    if (!memberCheck.ok) {
      return { success: false, error: memberCheck.error };
    }
  }

  const { data, error } = await supabase
    .from("grooming_records")
    .update({
      groomer_id: parsed.data.groomer_id,
      appointment_id: parsed.data.appointment_id || null,
      date: parsed.data.date,
      service_performed: parsed.data.service_performed,
      observations: parsed.data.observations || null,
      price: parsed.data.price ?? null,
    })
    .eq("id", recordId)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(
    `/${clinicSlug}/clients/${clientId}/pets/${petId}/grooming`
  );
  revalidatePath(
    `/${clinicSlug}/clients/${clientId}/pets/${petId}/grooming/${recordId}`
  );
  return { success: true, data: { id: data.id } };
}

export async function deleteGroomingRecord(
  recordId: string,
  clinicSlug: string,
  clientId: string,
  petId: string
): Promise<ActionResult> {
  const { supabase } = await getAuthUser();

  const { error } = await supabase
    .from("grooming_records")
    .delete()
    .eq("id", recordId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(
    `/${clinicSlug}/clients/${clientId}/pets/${petId}/grooming`
  );
  return { success: true, data: undefined };
}

export async function getGroomers(orgId: string) {
  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("id, first_name, last_name, specialty")
    .eq("org_id", orgId)
    .eq("active", true)
    .in("role", ["admin", "groomer"])
    .order("first_name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getLinkedGroomingRecord(appointmentId: string) {
  const supabase = await createSupabaseClient();

  const { data } = await supabase
    .from("grooming_records")
    .select("id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  return data;
}
