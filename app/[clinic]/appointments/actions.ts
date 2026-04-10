"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { appointmentSchema, updateStatusSchema } from "@/lib/validations/appointments";
import type { AppointmentInput } from "@/lib/validations/appointments";
import type { AppointmentStatus } from "@/types";

export type AppointmentWithRelations = {
  id: string;
  org_id: string;
  pet_id: string;
  client_id: string;
  vet_id: string;
  service_id: string | null;
  status: AppointmentStatus;
  date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  notes: string | null;
  reminder_sent: boolean;
  created_at: string;
  client: { id: string; first_name: string; last_name: string; phone: string | null };
  pet: { id: string; name: string; species: string | null; breed: string | null };
  vet: { id: string; first_name: string | null; last_name: string | null; specialty: string | null };
  service: { id: string; name: string; duration_minutes: number; price: number | null } | null;
};

export async function getAppointments(orgId: string, date?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("appointments")
    .select(
      `
      *,
      client:clients!client_id (id, first_name, last_name, phone),
      pet:pets!pet_id (id, name, species, breed),
      vet:organization_members!vet_id (id, first_name, last_name, specialty),
      service:services!service_id (id, name, duration_minutes, price)
    `
    )
    .eq("org_id", orgId)
    .order("start_time", { ascending: true });

  if (date) {
    query = query.eq("date", date);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as AppointmentWithRelations[], error: null };
}

export async function getAppointment(appointmentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      *,
      client:clients!client_id (id, first_name, last_name, phone, email),
      pet:pets!pet_id (id, name, species, breed, sex, birthdate),
      vet:organization_members!vet_id (id, first_name, last_name, specialty),
      service:services!service_id (id, name, duration_minutes, price, category)
    `
    )
    .eq("id", appointmentId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as AppointmentWithRelations, error: null };
}

export async function createAppointment(orgId: string, formData: AppointmentInput) {
  const parsed = appointmentSchema.safeParse(formData);

  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "No autenticado" };
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      org_id: orgId,
      client_id: parsed.data.client_id,
      pet_id: parsed.data.pet_id,
      vet_id: parsed.data.vet_id,
      service_id: parsed.data.service_id || null,
      date: parsed.data.date,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      reason: parsed.data.reason || null,
      notes: parsed.data.notes || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath(`/[clinic]/appointments`, "page");
  return { data, error: null };
}

export async function updateAppointment(appointmentId: string, formData: AppointmentInput) {
  const parsed = appointmentSchema.safeParse(formData);

  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "No autenticado" };
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({
      client_id: parsed.data.client_id,
      pet_id: parsed.data.pet_id,
      vet_id: parsed.data.vet_id,
      service_id: parsed.data.service_id || null,
      date: parsed.data.date,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      reason: parsed.data.reason || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", appointmentId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath(`/[clinic]/appointments`, "page");
  revalidatePath(`/[clinic]/appointments/${appointmentId}`, "page");
  return { data, error: null };
}

export async function updateAppointmentStatus(appointmentId: string, status: AppointmentStatus) {
  const parsed = updateStatusSchema.safeParse({ status });

  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "No autenticado" };
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({ status: parsed.data.status })
    .eq("id", appointmentId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath(`/[clinic]/appointments`, "page");
  revalidatePath(`/[clinic]/appointments/${appointmentId}`, "page");
  return { data, error: null };
}

export async function deleteAppointment(appointmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado" };
  }

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/[clinic]/appointments`, "page");
  return { error: null };
}

export async function getVets(orgId: string) {
  const supabase = await createClient();

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

export async function getClientsWithPets(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select(
      `
      id, first_name, last_name, phone,
      pets (id, name, species, breed, active)
    `
    )
    .eq("org_id", orgId)
    .order("first_name");

  if (error) {
    return { data: null, error: error.message };
  }

  const clientsWithActivePets = (data ?? []).map((client) => ({
    ...client,
    pets: (client.pets ?? []).filter((pet: { active: boolean }) => pet.active),
  }));

  return { data: clientsWithActivePets, error: null };
}

export async function getServices(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price, category")
    .eq("org_id", orgId)
    .eq("active", true)
    .order("name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}
