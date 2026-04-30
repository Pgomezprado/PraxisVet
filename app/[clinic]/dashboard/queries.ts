import "server-only";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type TodayAppointment = {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  type: string;
  reason: string | null;
  pet: {
    id: string;
    name: string;
    species: string | null;
    photo_url: string | null;
  } | null;
  client: { id: string; first_name: string; last_name: string } | null;
  assignee: { id: string; first_name: string | null; last_name: string | null } | null;
  service: { id: string; name: string } | null;
  /** ID de la ficha clínica asociada, si la cita ya tiene una creada. */
  linked_clinical_record_id: string | null;
  /** ID del registro de peluquería asociado, si existe. */
  linked_grooming_record_id: string | null;
};

type RawAppointment = {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  type: string;
  reason: string | null;
  pets: {
    id: string;
    name: string;
    species: string | null;
    photo_url: string | null;
  } | null;
  clients: { id: string; first_name: string; last_name: string } | null;
  organization_members: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  services: { id: string; name: string } | null;
  clinical_records: { id: string }[] | null;
  grooming_records: { id: string }[] | null;
};

function shapeAppointment(raw: RawAppointment): TodayAppointment {
  return {
    id: raw.id,
    date: raw.date,
    start_time: raw.start_time,
    end_time: raw.end_time,
    status: raw.status,
    type: raw.type,
    reason: raw.reason,
    pet: raw.pets,
    client: raw.clients,
    assignee: raw.organization_members,
    service: raw.services,
    linked_clinical_record_id: raw.clinical_records?.[0]?.id ?? null,
    linked_grooming_record_id: raw.grooming_records?.[0]?.id ?? null,
  };
}

const APPOINTMENT_SELECT = `
  id, date, start_time, end_time, status, type, reason,
  pets ( id, name, species, photo_url ),
  clients ( id, first_name, last_name ),
  organization_members!assigned_to ( id, first_name, last_name ),
  services ( id, name ),
  clinical_records!appointment_id ( id ),
  grooming_records!appointment_id ( id )
`;

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function nowISO(): string {
  return new Date().toISOString();
}

// ============================================
// Counts & sums
// ============================================

export async function getDashboardCounts(
  supabase: Supabase,
  orgId: string
): Promise<{
  appointmentsToday: number;
  totalClients: number;
  totalPets: number;
  totalServices: number;
}> {
  const today = todayISO();
  const [apts, clients, pets, services] = await Promise.all([
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("date", today),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("pets")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("services")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);

  return {
    appointmentsToday: apts.count ?? 0,
    totalClients: clients.count ?? 0,
    totalPets: pets.count ?? 0,
    totalServices: services.count ?? 0,
  };
}

export type OnboardingStatus = {
  servicesWithPrice: number;
  servicesTotal: number;
  productsActive: number;
  clientsTotal: number;
  clientsWithRut: number;
  appointmentsTotal: number;
  membersTotal: number;
  membersLinked: number;
};

export async function getOnboardingStatus(
  supabase: Supabase,
  orgId: string
): Promise<OnboardingStatus> {
  const [
    servicesPriced,
    servicesAll,
    productsAct,
    clientsAll,
    clientsRut,
    appts,
    membersAll,
    membersUser,
  ] = await Promise.all([
    supabase
      .from("services")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("active", true)
      .gt("price", 0),
    supabase
      .from("services")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("active", true),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("active", true),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .not("rut", "is", null)
      .neq("rut", ""),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("active", true),
    supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("active", true)
      .not("user_id", "is", null),
  ]);

  return {
    servicesWithPrice: servicesPriced.count ?? 0,
    servicesTotal: servicesAll.count ?? 0,
    productsActive: productsAct.count ?? 0,
    clientsTotal: clientsAll.count ?? 0,
    clientsWithRut: clientsRut.count ?? 0,
    appointmentsTotal: appts.count ?? 0,
    membersTotal: membersAll.count ?? 0,
    membersLinked: membersUser.count ?? 0,
  };
}

// ============================================
// Agenda queries
// ============================================

export async function getDayAgenda(
  supabase: Supabase,
  orgId: string,
  opts: { assignedTo?: string; type?: "medical" | "grooming" } = {}
): Promise<TodayAppointment[]> {
  let query = supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("org_id", orgId)
    .eq("date", todayISO())
    .order("start_time", { ascending: true });

  if (opts.assignedTo) query = query.eq("assigned_to", opts.assignedTo);
  if (opts.type) query = query.eq("type", opts.type);

  const { data } = await query;
  return (data ?? []).map((row) =>
    shapeAppointment(row as unknown as RawAppointment)
  );
}

/**
 * Trae las citas de la semana calendario actual (lunes → domingo).
 * Útil para dashboards que quieren contexto semanal en vez de sólo el día.
 */
export async function getWeekAgenda(
  supabase: Supabase,
  orgId: string,
  opts: { assignedTo?: string; type?: "medical" | "grooming" } = {}
): Promise<TodayAppointment[]> {
  const today = new Date(todayISO() + "T12:00:00");
  // getDay: 0=domingo, 1=lunes... Convertimos a "días desde lunes" (0..6)
  const dayOfWeek = today.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysSinceMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  let query = supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("org_id", orgId)
    .gte("date", fmt(monday))
    .lte("date", fmt(sunday))
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (opts.assignedTo) query = query.eq("assigned_to", opts.assignedTo);
  if (opts.type) query = query.eq("type", opts.type);

  const { data } = await query;
  return (data ?? []).map((row) =>
    shapeAppointment(row as unknown as RawAppointment)
  );
}

export async function getNextAppointment(
  supabase: Supabase,
  orgId: string,
  opts: { assignedTo?: string; type?: "medical" | "grooming" } = {}
): Promise<TodayAppointment | null> {
  const now = new Date();
  const today = todayISO();
  const currentTime = now.toTimeString().slice(0, 8);

  let query = supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("org_id", orgId)
    .eq("date", today)
    .gte("start_time", currentTime)
    .in("status", ["pending", "confirmed"])
    .order("start_time", { ascending: true })
    .limit(1);

  if (opts.assignedTo) query = query.eq("assigned_to", opts.assignedTo);
  if (opts.type) query = query.eq("type", opts.type);

  const { data } = await query;
  if (!data || data.length === 0) return null;
  return shapeAppointment(data[0] as unknown as RawAppointment);
}

// ============================================
// Actividad / recientes
// ============================================

export async function getRecentClients(
  supabase: Supabase,
  orgId: string,
  limit = 5
) {
  const { data } = await supabase
    .from("clients")
    .select("id, first_name, last_name, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ============================================
// Atención urgente
// ============================================

export type UrgentAttention = {
  lowStock: { count: number };
  unconfirmedAppointments: { count: number };
};

export async function getUrgentAttention(
  supabase: Supabase,
  orgId: string
): Promise<UrgentAttention> {
  const today = todayISO();

  const [pendingToday, lowStockRaw] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("date", today)
      .eq("status", "pending"),
    supabase
      .from("stock")
      .select("product_id, quantity, products!inner(min_stock, active)")
      .eq("org_id", orgId),
  ]);

  const lowStockCount = (lowStockRaw.data ?? []).filter((row) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    if (!product || !product.active) return false;
    const min = Number(product.min_stock) || 0;
    return min > 0 && Number(row.quantity) <= min;
  }).length;

  return {
    lowStock: { count: lowStockCount },
    unconfirmedAppointments: { count: pendingToday.count ?? 0 },
  };
}

// ============================================
// Vet stats (mi día)
// ============================================

export async function getMyDayStats(
  supabase: Supabase,
  orgId: string,
  memberId: string,
  opts: { type?: "medical" | "grooming" } = {}
): Promise<{
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
}> {
  const today = todayISO();
  let query = supabase
    .from("appointments")
    .select("status")
    .eq("org_id", orgId)
    .eq("date", today)
    .eq("assigned_to", memberId);

  if (opts.type) query = query.eq("type", opts.type);

  const { data } = await query;

  const rows = data ?? [];
  return {
    total: rows.length,
    completed: rows.filter((r) => r.status === "completed").length,
    inProgress: rows.filter(
      (r) =>
        r.status === "in_progress" || r.status === "ready_for_pickup"
    ).length,
    pending: rows.filter(
      (r) => r.status === "pending" || r.status === "confirmed"
    ).length,
  };
}

// ============================================
// Sala de espera (para recepcionista)
// ============================================

export async function getWaitingRoom(
  supabase: Supabase,
  orgId: string
): Promise<TodayAppointment[]> {
  const { data } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("org_id", orgId)
    .eq("date", todayISO())
    .in("status", ["in_progress", "ready_for_pickup"])
    .order("start_time", { ascending: true });

  return (data ?? []).map((row) =>
    shapeAppointment(row as unknown as RawAppointment)
  );
}

// Silence unused import warnings for types shared across roles
export { nowISO, todayISO };
