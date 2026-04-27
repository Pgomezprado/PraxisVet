import "server-only";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type TutorPet = {
  id: string;
  name: string;
  species: string | null;
  breed: string | null;
  sex: string | null;
  birthdate: string | null;
  photo_url: string | null;
};

export type TutorAppointment = {
  id: string;
  date: string;
  start_time: string;
  status: string;
  type: string;
  reason: string | null;
  pet: { id: string; name: string; species: string | null } | null;
  assignee: { first_name: string | null; last_name: string | null } | null;
  service: { id: string; name: string } | null;
};

export type TutorVaccination = {
  id: string;
  vaccine_name: string;
  date_administered: string;
  next_due_date: string | null;
  lot_number: string | null;
};

export type TutorDeworming = {
  id: string;
  type: string;
  date_administered: string;
  next_due_date: string | null;
  product: string | null;
};

export type TutorSharedExam = {
  id: string;
  type: string;
  custom_type_label: string | null;
  result_date: string | null;
  shared_with_tutor_at: string | null;
  vet_interpretation: string | null;
  result_file_name: string | null;
};

export type TutorGroomingRecord = {
  id: string;
  date: string;
  service_performed: string | null;
  observations: string | null;
  groomer: { first_name: string | null; last_name: string | null } | null;
  service: { name: string; price: number } | null;
};

export async function getTutorPets(
  supabase: Supabase
): Promise<TutorPet[]> {
  const { data } = await supabase
    .from("pets")
    .select("id, name, species, breed, sex, birthdate, photo_url, active")
    .eq("active", true)
    .order("name", { ascending: true });

  return (data ?? []).map((pet) => ({
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    sex: pet.sex,
    birthdate: pet.birthdate,
    photo_url: pet.photo_url,
  }));
}

export async function getTutorUpcomingAppointments(
  supabase: Supabase,
  limit = 10
): Promise<TutorAppointment[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("appointments")
    .select(
      `
      id, date, start_time, status, type, reason,
      pets ( id, name, species ),
      organization_members!appointments_assigned_to_fkey ( first_name, last_name ),
      services ( id, name )
    `
    )
    .gte("date", today)
    .in("status", ["pending", "confirmed"])
    .order("date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(limit);

  type Row = {
    id: string;
    date: string;
    start_time: string;
    status: string;
    type: string;
    reason: string | null;
    pets: { id: string; name: string; species: string | null } | null;
    organization_members: {
      first_name: string | null;
      last_name: string | null;
    } | null;
    services: { id: string; name: string } | null;
  };

  return (data ?? []).map((raw) => {
    const r = raw as unknown as Row;
    return {
      id: r.id,
      date: r.date,
      start_time: r.start_time,
      status: r.status,
      type: r.type,
      reason: r.reason,
      pet: r.pets,
      assignee: r.organization_members,
      service: r.services,
    };
  });
}

export async function getTutorPet(
  supabase: Supabase,
  petId: string
): Promise<TutorPet | null> {
  const { data } = await supabase
    .from("pets")
    .select("id, name, species, breed, sex, birthdate, photo_url, active")
    .eq("id", petId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    species: data.species,
    breed: data.breed,
    sex: data.sex,
    birthdate: data.birthdate,
    photo_url: data.photo_url,
  };
}

export async function getPetVaccinations(
  supabase: Supabase,
  petId: string
): Promise<TutorVaccination[]> {
  const { data } = await supabase
    .from("vaccinations")
    .select("id, vaccine_name, date_administered, next_due_date, lot_number")
    .eq("pet_id", petId)
    .order("date_administered", { ascending: false });
  return data ?? [];
}

export async function getPetDewormings(
  supabase: Supabase,
  petId: string
): Promise<TutorDeworming[]> {
  const { data } = await supabase
    .from("dewormings")
    .select("id, type, date_administered, next_due_date, product")
    .eq("pet_id", petId)
    .order("date_administered", { ascending: false });
  return data ?? [];
}

export async function getPetGroomingRecords(
  supabase: Supabase,
  petId: string
): Promise<TutorGroomingRecord[]> {
  const { data } = await supabase
    .from("grooming_records")
    .select(
      `
      id, date, service_performed, observations,
      organization_members!grooming_records_groomer_id_fkey ( first_name, last_name ),
      appointments ( services ( name, price ) )
    `
    )
    .eq("pet_id", petId)
    .order("date", { ascending: false });

  type Row = {
    id: string;
    date: string;
    service_performed: string | null;
    observations: string | null;
    organization_members: {
      first_name: string | null;
      last_name: string | null;
    } | null;
    appointments: {
      services: { name: string; price: number } | null;
    } | null;
  };

  return (data ?? []).map((raw) => {
    const r = raw as unknown as Row;
    return {
      id: r.id,
      date: r.date,
      service_performed: r.service_performed,
      observations: r.observations,
      groomer: r.organization_members,
      service: r.appointments?.services ?? null,
    };
  });
}

export async function getPetSharedExams(
  supabase: Supabase,
  petId: string
): Promise<TutorSharedExam[]> {
  const { data } = await supabase
    .from("clinical_record_exams")
    .select(
      "id, type, custom_type_label, result_date, shared_with_tutor_at, vet_interpretation, result_file_name"
    )
    .eq("pet_id", petId)
    .eq("status", "resultado_cargado")
    .not("shared_with_tutor_at", "is", null)
    .order("shared_with_tutor_at", { ascending: false });
  return (data ?? []) as TutorSharedExam[];
}

export async function getPetAppointments(
  supabase: Supabase,
  petId: string
): Promise<TutorAppointment[]> {
  const { data } = await supabase
    .from("appointments")
    .select(
      `
      id, date, start_time, status, type, reason,
      pets ( id, name, species ),
      organization_members!appointments_assigned_to_fkey ( first_name, last_name ),
      services ( id, name )
    `
    )
    .eq("pet_id", petId)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(20);

  type Row = {
    id: string;
    date: string;
    start_time: string;
    status: string;
    type: string;
    reason: string | null;
    pets: { id: string; name: string; species: string | null } | null;
    organization_members: {
      first_name: string | null;
      last_name: string | null;
    } | null;
    services: { id: string; name: string } | null;
  };

  return (data ?? []).map((raw) => {
    const r = raw as unknown as Row;
    return {
      id: r.id,
      date: r.date,
      start_time: r.start_time,
      status: r.status,
      type: r.type,
      reason: r.reason,
      pet: r.pets,
      assignee: r.organization_members,
      service: r.services,
    };
  });
}
