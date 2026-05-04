import { format, formatDistanceStrict, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

// =============================================================================
// Tipos
// =============================================================================

export type TimelineCategory = "salud" | "belleza" | "hito";

export type TimelineFilter = "todos" | "salud" | "belleza" | "hito";

export type VaccinationData = {
  id: string;
  vaccine_name: string;
  date_administered: string;
  next_due_date: string | null;
  lot_number: string | null;
  administered_by: string | null;
};

export type DewormingData = {
  id: string;
  type: string; // 'interna' | 'externa'
  date_administered: string;
  next_due_date: string | null;
  product: string | null;
};

export type MedicalConsultData = {
  id: string;
  date: string;
  vetName: string | null; // "Dr/a. Apellido"
};

export type ExamData = {
  id: string;
  type: string;
  custom_type_label: string | null;
  result_date: string | null;
  shared_with_tutor_at: string;
  vet_interpretation: string | null;
  result_file_name: string | null;
};

export type GroomingData = {
  id: string;
  date: string;
  service_performed: string | null;
  observations: string | null;
  groomerName: string | null;
};

export type BirthdayData = {
  petName: string;
  age: number; // años cumplidos
};

export type WelcomeData = {
  petName: string;
  clinicName: string;
};

export type BirthData = {
  petName: string;
};

export type AnniversaryData = {
  petName: string;
  clinicName: string;
  years: number;
};

export type FinalRestData = {
  petName: string;
};

export type TimelineEvent =
  | { kind: "vaccination"; date: Date; category: "salud"; data: VaccinationData }
  | { kind: "deworming"; date: Date; category: "salud"; data: DewormingData }
  | {
      kind: "medical_consult";
      date: Date;
      category: "salud";
      data: MedicalConsultData;
    }
  | { kind: "exam"; date: Date; category: "salud"; data: ExamData }
  | { kind: "grooming"; date: Date; category: "belleza"; data: GroomingData }
  | { kind: "birthday"; date: Date; category: "hito"; data: BirthdayData }
  | { kind: "welcome"; date: Date; category: "hito"; data: WelcomeData }
  | { kind: "birth"; date: Date; category: "hito"; data: BirthData }
  | { kind: "anniversary"; date: Date; category: "hito"; data: AnniversaryData }
  | { kind: "final_rest"; date: Date; category: "hito"; data: FinalRestData };

export type DayGroup = {
  /** YYYY-MM-DD */
  dayKey: string;
  date: Date;
  events: TimelineEvent[];
};

// =============================================================================
// Helpers de fecha
// =============================================================================

/** Convierte string YYYY-MM-DD a Date local al mediodía (evita drift por TZ). */
export function parseDayString(dayStr: string): Date {
  return new Date(dayStr + "T12:00:00");
}

/** Convierte timestamptz string a Date. */
export function parseTimestamp(ts: string): Date {
  return new Date(ts);
}

/** Devuelve YYYY-MM-DD en zona local. */
export function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Edad de la mascota a una fecha dada, en formato natural.
 * Si birthdate es null, devuelve null. Si la edad es <0 (evento antes de nacer), null.
 */
export function formatAge(
  birthdate: string | null,
  eventDate: Date,
  petName: string
): string | null {
  if (!birthdate) return null;
  const birth = parseDayString(birthdate);
  if (eventDate.getTime() < birth.getTime()) return null;

  const days = differenceInDays(eventDate, birth);
  if (days < 7) {
    if (days <= 1) return `${petName} recién había nacido`;
    return `${petName} tenía ${days} días`;
  }
  // <1 mes → semanas
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${petName} tenía ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
  }
  // calcular años + meses por diferencia de calendario
  const years =
    eventDate.getFullYear() -
    birth.getFullYear() -
    (eventDate.getMonth() < birth.getMonth() ||
    (eventDate.getMonth() === birth.getMonth() &&
      eventDate.getDate() < birth.getDate())
      ? 1
      : 0);
  const totalMonths =
    (eventDate.getFullYear() - birth.getFullYear()) * 12 +
    (eventDate.getMonth() - birth.getMonth()) -
    (eventDate.getDate() < birth.getDate() ? 1 : 0);

  if (years < 1) {
    return `${petName} tenía ${totalMonths} ${totalMonths === 1 ? "mes" : "meses"}`;
  }
  const months = totalMonths - years * 12;
  if (months === 0) {
    return `${petName} tenía ${years} ${years === 1 ? "año" : "años"}`;
  }
  return `${petName} tenía ${years} ${years === 1 ? "año" : "años"} ${months} ${months === 1 ? "mes" : "meses"}`;
}

/**
 * Tiempo relativo en es-CL para encabezado de card.
 * - Hoy / Ayer / Hace N días (≤7)
 * - Hace N semanas (8-29 días)
 * - Hace N meses (30-364 días)
 * - Después: "14 de marzo de 2025"
 */
export function formatRelativeDate(date: Date, now: Date = new Date()): string {
  const days = differenceInDays(now, date);
  if (days < 0) {
    // futuro
    return format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
  }
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days <= 7) return `Hace ${days} días`;
  if (days <= 29) {
    const weeks = Math.floor(days / 7);
    return `Hace ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
  }
  if (days <= 364) {
    const months = Math.floor(days / 30);
    return `Hace ${months} ${months === 1 ? "mes" : "meses"}`;
  }
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** Formato absoluto largo para detalle. */
export function formatLongDate(date: Date): string {
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** Formato corto dd-MM-yyyy. */
export function formatShortDate(date: Date): string {
  return format(date, "dd-MM-yyyy");
}

/**
 * "desde [año]" o "desde hace N meses" si <1 año.
 */
export function formatTenureSince(welcomeDate: Date, now: Date = new Date()): string {
  const days = differenceInDays(now, welcomeDate);
  if (days < 30) {
    return "desde hace pocos días";
  }
  if (days < 365) {
    const months = Math.max(1, Math.floor(days / 30));
    return `desde hace ${months} ${months === 1 ? "mes" : "meses"}`;
  }
  return `desde ${welcomeDate.getFullYear()}`;
}

/**
 * Total de momentos: cuenta eventos no-sintéticos (excluye birthday/anniversary/birth/welcome/final_rest)
 * y total de años de historia desde la primera cita o birth.
 */
export function summarizeHistory(
  events: TimelineEvent[],
  earliestDate: Date | null,
  now: Date = new Date()
): { momentsCount: number; yearsCount: number } {
  const realCount = events.filter(
    (e) =>
      e.kind === "vaccination" ||
      e.kind === "deworming" ||
      e.kind === "medical_consult" ||
      e.kind === "exam" ||
      e.kind === "grooming"
  ).length;
  const years = earliestDate
    ? Math.max(0, Math.floor(differenceInDays(now, earliestDate) / 365))
    : 0;
  return { momentsCount: realCount, yearsCount: years };
}

// =============================================================================
// Hitos sintéticos
// =============================================================================

/**
 * Genera un cumpleaños por cada año entre nacimiento y hoy/deceased.
 * Maneja 29 de febrero → 28 de febrero en años no bisiestos.
 */
export function buildBirthdayEvents(
  birthdate: string | null,
  petName: string,
  now: Date = new Date(),
  endDate: Date | null = null
): TimelineEvent[] {
  if (!birthdate) return [];
  const birth = parseDayString(birthdate);
  const cap = endDate ?? now;
  const events: TimelineEvent[] = [];
  const startYear = birth.getFullYear() + 1;
  for (let year = startYear; year <= cap.getFullYear(); year++) {
    const month = birth.getMonth();
    let day = birth.getDate();
    // 29 feb → 28 feb en años no bisiestos
    if (month === 1 && day === 29) {
      const isLeap =
        (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      if (!isLeap) day = 28;
    }
    const cumple = new Date(year, month, day, 12, 0, 0);
    if (cumple.getTime() > cap.getTime()) break;
    if (cumple.getTime() < birth.getTime()) continue;
    const age = year - birth.getFullYear();
    events.push({
      kind: "birthday",
      date: cumple,
      category: "hito",
      data: { petName, age },
    });
  }
  return events;
}

/**
 * Hitos de aniversario contigo en la clínica: 1, 5, 10, 15, 20 años desde welcome.
 */
export function buildAnniversaryEvents(
  welcomeDate: Date,
  petName: string,
  clinicName: string,
  now: Date = new Date(),
  endDate: Date | null = null
): TimelineEvent[] {
  const cap = endDate ?? now;
  const events: TimelineEvent[] = [];
  const milestones = [1, 5, 10, 15, 20];
  for (const years of milestones) {
    const aniv = new Date(
      welcomeDate.getFullYear() + years,
      welcomeDate.getMonth(),
      welcomeDate.getDate(),
      12,
      0,
      0
    );
    if (aniv.getTime() > cap.getTime()) break;
    events.push({
      kind: "anniversary",
      date: aniv,
      category: "hito",
      data: { petName, clinicName, years },
    });
  }
  return events;
}

// =============================================================================
// Merge / orden / agrupación
// =============================================================================

/**
 * Ordena eventos por fecha descendente y agrupa por día (YYYY-MM-DD).
 * Dentro de cada día, mantiene el orden estable (hito al inicio, luego salud, luego belleza).
 */
export function groupByDay(events: TimelineEvent[]): DayGroup[] {
  const sorted = [...events].sort((a, b) => b.date.getTime() - a.date.getTime());
  const map = new Map<string, DayGroup>();
  for (const ev of sorted) {
    const key = toDayKey(ev.date);
    let g = map.get(key);
    if (!g) {
      g = { dayKey: key, date: ev.date, events: [] };
      map.set(key, g);
    }
    g.events.push(ev);
  }
  // Orden interno por categoría (hito primero, luego salud, luego belleza)
  const catOrder: Record<TimelineCategory, number> = {
    hito: 0,
    salud: 1,
    belleza: 2,
  };
  for (const g of map.values()) {
    g.events.sort((a, b) => catOrder[a.category] - catOrder[b.category]);
  }
  return Array.from(map.values());
}

/**
 * Filtra grupos: descarta días sin ningún evento que matchee el filtro.
 * Dentro de cada día, deja solo los eventos del filtro (a menos que sea "todos").
 */
export function applyFilter(
  groups: DayGroup[],
  filter: TimelineFilter
): DayGroup[] {
  if (filter === "todos") return groups;
  return groups
    .map((g) => ({
      ...g,
      events: g.events.filter((e) => e.category === filter),
    }))
    .filter((g) => g.events.length > 0);
}

/**
 * Particiona los grupos en buckets temporales para los headers de sección:
 * - "hoy": últimos 7 días desde now
 * - por año: 2026, 2025, ... (hasta `principleYear` exclusivo si hay)
 * - "principio": el año exacto de welcome/birth, agrupado aparte
 *
 * Como queremos "EL PRINCIPIO" como sección final, lo separamos:
 * isolamos los grupos cuyo evento contenga 'birth' o 'welcome' (esos son los más antiguos)
 * y los movemos al bucket "principio".
 */
export type TimelineSection = {
  id: string; // 'hoy' | year:N | 'principio'
  label: string;
  alwaysOpen: boolean;
  defaultOpen: boolean;
  groups: DayGroup[];
};

export function buildSections(
  groups: DayGroup[],
  now: Date = new Date()
): TimelineSection[] {
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Identificar los grupos del "principio": aquellos que contienen birth o welcome
  const principleGroups: DayGroup[] = [];
  const otherGroups: DayGroup[] = [];
  for (const g of groups) {
    const isPrinciple = g.events.some(
      (e) => e.kind === "birth" || e.kind === "welcome"
    );
    if (isPrinciple) principleGroups.push(g);
    else otherGroups.push(g);
  }

  const today: DayGroup[] = [];
  const byYear = new Map<number, DayGroup[]>();
  for (const g of otherGroups) {
    if (g.date.getTime() >= sevenDaysAgo.getTime()) {
      today.push(g);
    } else {
      const y = g.date.getFullYear();
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y)!.push(g);
    }
  }

  const sections: TimelineSection[] = [];
  if (today.length > 0) {
    sections.push({
      id: "hoy",
      label: "Hoy",
      alwaysOpen: true,
      defaultOpen: true,
      groups: today,
    });
  }
  const currentYear = now.getFullYear();
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);
  for (const y of years) {
    sections.push({
      id: `year-${y}`,
      label: String(y),
      alwaysOpen: false,
      defaultOpen: y === currentYear,
      groups: byYear.get(y)!,
    });
  }
  if (principleGroups.length > 0) {
    sections.push({
      id: "principio",
      label: "El principio",
      alwaysOpen: true,
      defaultOpen: true,
      groups: principleGroups,
    });
  }
  return sections;
}

// =============================================================================
// Builder principal: combina fuentes + hitos
// =============================================================================

export type MergeInput = {
  petName: string;
  birthdate: string | null;
  /** ISO timestamptz, puede ser null */
  petCreatedAt: string | null;
  clinicName: string;
  /** Si la mascota falleció (la columna no existe en MVP, pasar null). */
  deceasedAt: string | null;
  vaccinations: VaccinationData[];
  dewormings: DewormingData[];
  /** Citas médicas COMPLETED type=medical, con vetName ya resuelto. */
  medicalConsults: MedicalConsultData[];
  /** Primera cita absoluta (cualquier tipo, cualquier estado) — para welcome fallback. */
  firstAppointmentDate: string | null;
  exams: ExamData[];
  groomings: GroomingData[];
  now?: Date;
};

export function mergeTimelineEvents(input: MergeInput): {
  events: TimelineEvent[];
  welcomeDate: Date;
  earliestDate: Date | null;
} {
  const now = input.now ?? new Date();
  const events: TimelineEvent[] = [];

  // Welcome: primera cita o pets.created_at fallback
  const welcomeSource =
    input.firstAppointmentDate ||
    (input.petCreatedAt ? input.petCreatedAt.slice(0, 10) : null);
  const welcomeDate = welcomeSource
    ? parseDayString(welcomeSource)
    : input.petCreatedAt
      ? parseTimestamp(input.petCreatedAt)
      : now;

  // Birth (solo si tenemos birthdate)
  if (input.birthdate) {
    events.push({
      kind: "birth",
      date: parseDayString(input.birthdate),
      category: "hito",
      data: { petName: input.petName },
    });
  }

  // Welcome
  events.push({
    kind: "welcome",
    date: welcomeDate,
    category: "hito",
    data: { petName: input.petName, clinicName: input.clinicName },
  });

  // Vacunaciones
  for (const v of input.vaccinations) {
    events.push({
      kind: "vaccination",
      date: parseDayString(v.date_administered),
      category: "salud",
      data: v,
    });
  }
  // Desparasitaciones
  for (const d of input.dewormings) {
    events.push({
      kind: "deworming",
      date: parseDayString(d.date_administered),
      category: "salud",
      data: d,
    });
  }
  // Consultas médicas
  for (const c of input.medicalConsults) {
    events.push({
      kind: "medical_consult",
      date: parseDayString(c.date),
      category: "salud",
      data: c,
    });
  }
  // Exámenes (filtrados ya por shared_with_tutor_at en query)
  for (const ex of input.exams) {
    const dateStr = ex.result_date ?? ex.shared_with_tutor_at.slice(0, 10);
    events.push({
      kind: "exam",
      date: parseDayString(dateStr),
      category: "salud",
      data: ex,
    });
  }
  // Peluquería
  for (const g of input.groomings) {
    events.push({
      kind: "grooming",
      date: parseDayString(g.date),
      category: "belleza",
      data: g,
    });
  }

  // Cumpleaños sintéticos
  const deceasedDate = input.deceasedAt ? parseDayString(input.deceasedAt) : null;
  events.push(
    ...buildBirthdayEvents(input.birthdate, input.petName, now, deceasedDate)
  );

  // Aniversarios sintéticos
  events.push(
    ...buildAnniversaryEvents(
      welcomeDate,
      input.petName,
      input.clinicName,
      now,
      deceasedDate
    )
  );

  // Cierre (deceased)
  if (deceasedDate) {
    events.push({
      kind: "final_rest",
      date: deceasedDate,
      category: "hito",
      data: { petName: input.petName },
    });
  }

  // Earliest: birth si existe, si no welcome
  const earliestDate = input.birthdate
    ? parseDayString(input.birthdate)
    : welcomeDate;

  return { events, welcomeDate, earliestDate };
}
