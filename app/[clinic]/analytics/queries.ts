import "server-only";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type AnalyticsPeriod = "month" | "3m" | "year";

// Rango de fechas + rango equivalente del año anterior para comparación.
export type PeriodRange = {
  period: AnalyticsPeriod;
  start: Date;
  end: Date;
  compareStart: Date;
  compareEnd: Date;
  bucket: "day" | "month";
  label: string;
};

/**
 * Devuelve el rango actual y el equivalente del año anterior.
 * - month: desde el día 1 del mes actual hasta hoy
 * - 3m: últimos 90 días hasta hoy
 * - year: últimos 12 meses agrupados por mes
 */
export function resolvePeriod(period: AnalyticsPeriod): PeriodRange {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;
  let bucket: "day" | "month";
  let label: string;

  if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    bucket = "day";
    label = "Este mes";
  } else if (period === "3m") {
    start = new Date(now);
    start.setDate(start.getDate() - 89);
    start.setHours(0, 0, 0, 0);
    bucket = "day";
    label = "Últimos 90 días";
  } else {
    start = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
    start.setHours(0, 0, 0, 0);
    bucket = "month";
    label = "Últimos 12 meses";
  }

  const compareStart = new Date(start);
  compareStart.setFullYear(compareStart.getFullYear() - 1);
  const compareEnd = new Date(end);
  compareEnd.setFullYear(compareEnd.getFullYear() - 1);

  return { period, start, end, compareStart, compareEnd, bucket, label };
}

function bucketKey(date: Date, bucket: "day" | "month"): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  if (bucket === "month") return `${y}-${m}`;
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function enumerateBuckets(
  start: Date,
  end: Date,
  bucket: "day" | "month"
): string[] {
  const keys: string[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  if (bucket === "month") cursor.setDate(1);

  while (cursor <= end) {
    keys.push(bucketKey(cursor, bucket));
    if (bucket === "day") cursor.setDate(cursor.getDate() + 1);
    else cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

// ============================================
// 1) Ingresos por período + comparación año anterior
// ============================================

export type RevenuePoint = {
  bucket: string;
  current: number;
  previous: number;
};

export type RevenueSeries = {
  points: RevenuePoint[];
  totalCurrent: number;
  totalPrevious: number;
  deltaPct: number | null;
};

export async function getRevenueSeries(
  supabase: Supabase,
  orgId: string,
  range: PeriodRange
): Promise<RevenueSeries> {
  const [current, previous] = await Promise.all([
    supabase
      .from("invoices")
      .select("total, paid_at")
      .eq("org_id", orgId)
      .eq("status", "paid")
      .gte("paid_at", range.start.toISOString())
      .lte("paid_at", range.end.toISOString()),
    supabase
      .from("invoices")
      .select("total, paid_at")
      .eq("org_id", orgId)
      .eq("status", "paid")
      .gte("paid_at", range.compareStart.toISOString())
      .lte("paid_at", range.compareEnd.toISOString()),
  ]);

  const keys = enumerateBuckets(range.start, range.end, range.bucket);
  const currentMap = new Map<string, number>(keys.map((k) => [k, 0]));
  const previousMap = new Map<string, number>(keys.map((k) => [k, 0]));

  for (const row of current.data ?? []) {
    if (!row.paid_at) continue;
    const d = new Date(row.paid_at);
    const key = bucketKey(d, range.bucket);
    currentMap.set(key, (currentMap.get(key) ?? 0) + (Number(row.total) || 0));
  }

  // Para el período anterior, re-mapeamos al bucket equivalente del actual
  // desplazando +1 año, para que el gráfico alinee puntos por posición.
  for (const row of previous.data ?? []) {
    if (!row.paid_at) continue;
    const d = new Date(row.paid_at);
    d.setFullYear(d.getFullYear() + 1);
    const key = bucketKey(d, range.bucket);
    if (previousMap.has(key)) {
      previousMap.set(
        key,
        (previousMap.get(key) ?? 0) + (Number(row.total) || 0)
      );
    }
  }

  const points = keys.map((k) => ({
    bucket: k,
    current: currentMap.get(k) ?? 0,
    previous: previousMap.get(k) ?? 0,
  }));

  const totalCurrent = points.reduce((s, p) => s + p.current, 0);
  const totalPrevious = points.reduce((s, p) => s + p.previous, 0);
  const deltaPct =
    totalPrevious === 0
      ? null
      : ((totalCurrent - totalPrevious) / totalPrevious) * 100;

  return { points, totalCurrent, totalPrevious, deltaPct };
}

// ============================================
// 2) Citas: agendadas vs realizadas vs no-show
// ============================================

export type AppointmentsBreakdown = {
  points: Array<{
    bucket: string;
    scheduled: number;
    completed: number;
    no_show: number;
    cancelled: number;
  }>;
  totals: {
    scheduled: number;
    completed: number;
    no_show: number;
    cancelled: number;
    completionRate: number | null; // completed / (completed + no_show)
    noShowRate: number | null; // no_show / scheduled
  };
};

export async function getAppointmentsBreakdown(
  supabase: Supabase,
  orgId: string,
  range: PeriodRange
): Promise<AppointmentsBreakdown> {
  const startISO = range.start.toISOString().slice(0, 10);
  const endISO = range.end.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("appointments")
    .select("status, date")
    .eq("org_id", orgId)
    .gte("date", startISO)
    .lte("date", endISO);

  const keys = enumerateBuckets(range.start, range.end, range.bucket);
  type Row = {
    bucket: string;
    scheduled: number;
    completed: number;
    no_show: number;
    cancelled: number;
  };
  const map = new Map<string, Row>(
    keys.map((k) => [
      k,
      { bucket: k, scheduled: 0, completed: 0, no_show: 0, cancelled: 0 },
    ])
  );

  for (const row of data ?? []) {
    const d = new Date(row.date + "T12:00:00");
    const key = bucketKey(d, range.bucket);
    const entry = map.get(key);
    if (!entry) continue;
    if (row.status !== "cancelled") entry.scheduled += 1;
    if (row.status === "completed") entry.completed += 1;
    if (row.status === "no_show") entry.no_show += 1;
    if (row.status === "cancelled") entry.cancelled += 1;
  }

  const points = keys.map((k) => map.get(k)!);
  const totals = points.reduce(
    (acc, p) => ({
      scheduled: acc.scheduled + p.scheduled,
      completed: acc.completed + p.completed,
      no_show: acc.no_show + p.no_show,
      cancelled: acc.cancelled + p.cancelled,
    }),
    { scheduled: 0, completed: 0, no_show: 0, cancelled: 0 }
  );

  const attended = totals.completed + totals.no_show;
  const completionRate = attended === 0 ? null : (totals.completed / attended) * 100;
  const noShowRate =
    totals.scheduled === 0 ? null : (totals.no_show / totals.scheduled) * 100;

  return {
    points,
    totals: {
      ...totals,
      completionRate,
      noShowRate,
    },
  };
}

// ============================================
// 3) Top servicios y productos (MVP: por description, sin FK)
// ============================================

export type TopItem = {
  key: string; // description
  itemType: "service" | "product";
  revenue: number;
  quantity: number;
};

export type TopItemsResult = {
  services: TopItem[];
  products: TopItem[];
};

export async function getTopServicesProducts(
  supabase: Supabase,
  orgId: string,
  range: PeriodRange,
  limit = 5
): Promise<TopItemsResult> {
  // Traemos invoice_items cuya invoice esté pagada y dentro del rango.
  const { data } = await supabase
    .from("invoice_items")
    .select(
      "description, quantity, total, item_type, invoices!inner(status, paid_at, org_id)"
    )
    .eq("invoices.org_id", orgId)
    .eq("invoices.status", "paid")
    .gte("invoices.paid_at", range.start.toISOString())
    .lte("invoices.paid_at", range.end.toISOString());

  type Agg = { revenue: number; quantity: number };
  const services = new Map<string, Agg>();
  const products = new Map<string, Agg>();

  for (const row of (data ?? []) as Array<{
    description: string;
    quantity: number;
    total: number;
    item_type: "service" | "product" | null;
  }>) {
    if (!row.item_type) continue;
    const key = (row.description ?? "").trim() || "(sin descripción)";
    const bucket = row.item_type === "service" ? services : products;
    const current = bucket.get(key) ?? { revenue: 0, quantity: 0 };
    current.revenue += Number(row.total) || 0;
    current.quantity += Number(row.quantity) || 0;
    bucket.set(key, current);
  }

  const toTop = (
    map: Map<string, Agg>,
    type: "service" | "product"
  ): TopItem[] =>
    Array.from(map.entries())
      .map(([key, v]) => ({ key, itemType: type, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

  return {
    services: toTop(services, "service"),
    products: toTop(products, "product"),
  };
}

// ============================================
// 4) Productividad por profesional
// ============================================

export type ProfessionalRow = {
  memberId: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  completed: number;
  scheduled: number;
  noShow: number;
  revenue: number;
};

export async function getProfessionalProductivity(
  supabase: Supabase,
  orgId: string,
  range: PeriodRange
): Promise<ProfessionalRow[]> {
  const startDate = range.start.toISOString().slice(0, 10);
  const endDate = range.end.toISOString().slice(0, 10);

  // 1) Todas las citas del período con su assigned_to
  const [apptsRes, membersRes, invoicesRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, assigned_to, status, date")
      .eq("org_id", orgId)
      .gte("date", startDate)
      .lte("date", endDate)
      .not("assigned_to", "is", null),
    supabase
      .from("organization_members")
      .select("id, first_name, last_name, role, active")
      .eq("org_id", orgId)
      .in("role", ["vet", "groomer"]),
    supabase
      .from("invoices")
      .select("total, appointment_id, status, paid_at")
      .eq("org_id", orgId)
      .eq("status", "paid")
      .gte("paid_at", range.start.toISOString())
      .lte("paid_at", range.end.toISOString())
      .not("appointment_id", "is", null),
  ]);

  const membersById = new Map(
    (membersRes.data ?? []).map((m) => [m.id, m])
  );

  // 2) Map appointment_id → assigned_to
  const apptToAssignee = new Map<string, string>();
  const stats = new Map<
    string,
    { completed: number; scheduled: number; noShow: number; revenue: number }
  >();

  for (const a of apptsRes.data ?? []) {
    if (!a.assigned_to) continue;
    apptToAssignee.set(a.id, a.assigned_to);

    const bucket = stats.get(a.assigned_to) ?? {
      completed: 0,
      scheduled: 0,
      noShow: 0,
      revenue: 0,
    };
    if (a.status !== "cancelled") bucket.scheduled += 1;
    if (a.status === "completed") bucket.completed += 1;
    if (a.status === "no_show") bucket.noShow += 1;
    stats.set(a.assigned_to, bucket);
  }

  // 3) Sumar revenue por profesional vía appointment_id en invoice
  for (const inv of invoicesRes.data ?? []) {
    if (!inv.appointment_id) continue;
    const assignee = apptToAssignee.get(inv.appointment_id);
    if (!assignee) continue;
    const bucket = stats.get(assignee) ?? {
      completed: 0,
      scheduled: 0,
      noShow: 0,
      revenue: 0,
    };
    bucket.revenue += Number(inv.total) || 0;
    stats.set(assignee, bucket);
  }

  const rows: ProfessionalRow[] = [];
  for (const [memberId, s] of stats) {
    const member = membersById.get(memberId);
    if (!member) continue;
    rows.push({
      memberId,
      firstName: member.first_name,
      lastName: member.last_name,
      role: member.role,
      ...s,
    });
  }

  return rows.sort((a, b) => b.revenue - a.revenue);
}
