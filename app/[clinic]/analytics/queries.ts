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
// Citas: agendadas vs realizadas vs no-show
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
// Productividad por profesional
// ============================================

export type ProfessionalRow = {
  memberId: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  completed: number;
  scheduled: number;
  noShow: number;
};

export async function getProfessionalProductivity(
  supabase: Supabase,
  orgId: string,
  range: PeriodRange
): Promise<ProfessionalRow[]> {
  const startDate = range.start.toISOString().slice(0, 10);
  const endDate = range.end.toISOString().slice(0, 10);

  const [apptsRes, membersRes] = await Promise.all([
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
  ]);

  const membersById = new Map(
    (membersRes.data ?? []).map((m) => [m.id, m])
  );

  const stats = new Map<
    string,
    { completed: number; scheduled: number; noShow: number }
  >();

  for (const a of apptsRes.data ?? []) {
    if (!a.assigned_to) continue;

    const bucket = stats.get(a.assigned_to) ?? {
      completed: 0,
      scheduled: 0,
      noShow: 0,
    };
    if (a.status !== "cancelled") bucket.scheduled += 1;
    if (a.status === "completed") bucket.completed += 1;
    if (a.status === "no_show") bucket.noShow += 1;
    stats.set(a.assigned_to, bucket);
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

  return rows.sort((a, b) => b.completed - a.completed);
}
