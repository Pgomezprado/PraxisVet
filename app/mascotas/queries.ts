import "server-only";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type HubPet = {
  id: string;
  name: string;
  species: string | null;
  breed: string | null;
  sex: string | null;
  birthdate: string | null;
  photo_url: string | null;
  org: { id: string; name: string; slug: string; logo_url: string | null };
};

export type HubVaccinationSummary = {
  lastDate: string | null;
  nextDue: string | null;
  count: number;
};

export type HubDewormingSummary = {
  lastDate: string | null;
  nextDue: string | null;
  count: number;
};

export type HubSharedExamsSummary = {
  count: number;
  lastSharedAt: string | null;
};

export type HubGroomingSummary = {
  lastDate: string | null;
  lastService: string | null;
  count: number;
  nextScheduledDate: string | null;
  nextScheduledTime: string | null;
};

export type HubHealthPet = HubPet & {
  vaccinations: HubVaccinationSummary;
  dewormings: HubDewormingSummary;
  sharedExams: HubSharedExamsSummary;
};

export type HubGroomingPet = HubPet & {
  grooming: HubGroomingSummary;
};

type PetRow = {
  id: string;
  name: string;
  species: string | null;
  breed: string | null;
  sex: string | null;
  birthdate: string | null;
  photo_url: string | null;
  clients: {
    organizations: {
      id: string;
      name: string;
      slug: string;
      logo_url: string | null;
    } | null;
  } | null;
};

export async function getHubPets(supabase: Supabase): Promise<HubPet[]> {
  return getHubPetsBase(supabase);
}

async function getHubPetsBase(supabase: Supabase): Promise<HubPet[]> {
  const { data } = await supabase
    .from("pets")
    .select(
      `
      id, name, species, breed, sex, birthdate, photo_url, active,
      clients!inner (
        organizations!inner ( id, name, slug, logo_url )
      )
    `
    )
    .eq("active", true)
    .order("name", { ascending: true });

  const rows = (data ?? []) as unknown as PetRow[];
  return rows
    .filter((row) => !!row.clients?.organizations)
    .map((row) => ({
      id: row.id,
      name: row.name,
      species: row.species,
      breed: row.breed,
      sex: row.sex,
      birthdate: row.birthdate,
      photo_url: row.photo_url,
      org: row.clients!.organizations!,
    }));
}

export async function getHubHealthPets(
  supabase: Supabase
): Promise<HubHealthPet[]> {
  const pets = await getHubPetsBase(supabase);
  if (pets.length === 0) return [];

  const petIds = pets.map((p) => p.id);

  const [vaccRes, dewRes, examRes] = await Promise.all([
    supabase
      .from("vaccinations")
      .select("pet_id, date_administered, next_due_date")
      .in("pet_id", petIds),
    supabase
      .from("dewormings")
      .select("pet_id, date_administered, next_due_date")
      .in("pet_id", petIds),
    supabase
      .from("clinical_record_exams")
      .select("pet_id, shared_with_tutor_at")
      .eq("status", "resultado_cargado")
      .not("shared_with_tutor_at", "is", null)
      .in("pet_id", petIds),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  const vaccByPet = new Map<string, HubVaccinationSummary>();
  for (const row of vaccRes.data ?? []) {
    const existing = vaccByPet.get(row.pet_id) ?? {
      lastDate: null,
      nextDue: null,
      count: 0,
    };
    existing.count += 1;
    if (
      row.date_administered &&
      (!existing.lastDate || row.date_administered > existing.lastDate)
    ) {
      existing.lastDate = row.date_administered;
    }
    if (
      row.next_due_date &&
      row.next_due_date >= today &&
      (!existing.nextDue || row.next_due_date < existing.nextDue)
    ) {
      existing.nextDue = row.next_due_date;
    }
    vaccByPet.set(row.pet_id, existing);
  }

  const dewByPet = new Map<string, HubDewormingSummary>();
  for (const row of dewRes.data ?? []) {
    const existing = dewByPet.get(row.pet_id) ?? {
      lastDate: null,
      nextDue: null,
      count: 0,
    };
    existing.count += 1;
    if (
      row.date_administered &&
      (!existing.lastDate || row.date_administered > existing.lastDate)
    ) {
      existing.lastDate = row.date_administered;
    }
    if (
      row.next_due_date &&
      row.next_due_date >= today &&
      (!existing.nextDue || row.next_due_date < existing.nextDue)
    ) {
      existing.nextDue = row.next_due_date;
    }
    dewByPet.set(row.pet_id, existing);
  }

  const examByPet = new Map<string, HubSharedExamsSummary>();
  for (const row of examRes.data ?? []) {
    const existing = examByPet.get(row.pet_id) ?? {
      count: 0,
      lastSharedAt: null,
    };
    existing.count += 1;
    if (
      row.shared_with_tutor_at &&
      (!existing.lastSharedAt ||
        row.shared_with_tutor_at > existing.lastSharedAt)
    ) {
      existing.lastSharedAt = row.shared_with_tutor_at;
    }
    examByPet.set(row.pet_id, existing);
  }

  return pets.map((pet) => ({
    ...pet,
    vaccinations:
      vaccByPet.get(pet.id) ?? { lastDate: null, nextDue: null, count: 0 },
    dewormings:
      dewByPet.get(pet.id) ?? { lastDate: null, nextDue: null, count: 0 },
    sharedExams:
      examByPet.get(pet.id) ?? { count: 0, lastSharedAt: null },
  }));
}

export async function getWaitlistDefaults(supabase: Supabase): Promise<{
  email: string | undefined;
  species: "canino" | "felino" | "exotico" | undefined;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { email: undefined, species: undefined };

  const email = user.email ?? undefined;

  const { data: petRow } = await supabase
    .from("pets")
    .select("species")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const speciesRaw = (petRow as { species: string | null } | null)?.species ?? null;
  const species =
    speciesRaw === "canino" || speciesRaw === "felino" || speciesRaw === "exotico"
      ? speciesRaw
      : undefined;

  return { email, species };
}

export type GroomingClinicDirectoryEntry = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  groomer_count: number;
};

export async function getGroomingClinicDirectory(
  supabase: Supabase
): Promise<GroomingClinicDirectoryEntry[]> {
  const { data, error } = await supabase.rpc("get_grooming_clinic_directory");
  if (error) {
    console.error("[getGroomingClinicDirectory] rpc error", error);
    return [];
  }
  type Row = {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    address: string | null;
    phone: string | null;
    groomer_count: number | string | null;
  };
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    logo_url: r.logo_url,
    address: r.address,
    phone: r.phone,
    groomer_count: Number(r.groomer_count ?? 0),
  }));
}

export async function getHubGroomingPets(
  supabase: Supabase
): Promise<HubGroomingPet[]> {
  const pets = await getHubPetsBase(supabase);
  if (pets.length === 0) return [];

  const petIds = pets.map((p) => p.id);
  const today = new Date().toISOString().slice(0, 10);

  const [groomRes, apptRes] = await Promise.all([
    supabase
      .from("grooming_records")
      .select("pet_id, date, service_performed")
      .in("pet_id", petIds)
      .order("date", { ascending: false }),
    supabase
      .from("appointments")
      .select("pet_id, date, start_time, status, type")
      .in("pet_id", petIds)
      .eq("type", "grooming")
      .in("status", ["pending", "confirmed", "in_progress"])
      .gte("date", today)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true }),
  ]);

  const groomByPet = new Map<string, HubGroomingSummary>();
  for (const row of groomRes.data ?? []) {
    const existing = groomByPet.get(row.pet_id) ?? {
      lastDate: null,
      lastService: null,
      count: 0,
      nextScheduledDate: null,
      nextScheduledTime: null,
    };
    existing.count += 1;
    if (row.date && (!existing.lastDate || row.date > existing.lastDate)) {
      existing.lastDate = row.date;
      existing.lastService = row.service_performed;
    }
    groomByPet.set(row.pet_id, existing);
  }

  for (const row of apptRes.data ?? []) {
    const existing = groomByPet.get(row.pet_id) ?? {
      lastDate: null,
      lastService: null,
      count: 0,
      nextScheduledDate: null,
      nextScheduledTime: null,
    };
    if (!existing.nextScheduledDate) {
      existing.nextScheduledDate = row.date;
      existing.nextScheduledTime = row.start_time;
    }
    groomByPet.set(row.pet_id, existing);
  }

  return pets.map((pet) => ({
    ...pet,
    grooming:
      groomByPet.get(pet.id) ?? {
        lastDate: null,
        lastService: null,
        count: 0,
        nextScheduledDate: null,
        nextScheduledTime: null,
      },
  }));
}
