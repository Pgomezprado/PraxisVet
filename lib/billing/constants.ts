import type { Plan, SubscriptionStatus } from "@/types";

export const TRIAL_DURATION_DAYS = 60;

/**
 * Cuando el banner en dashboard empieza a aparecer:
 * durante los últimos N días del trial.
 */
export const TRIAL_WARNING_THRESHOLD_DAYS = 14;

/**
 * Días-antes-del-vencimiento en los que el cron dispara un correo al admin.
 * 7 = recordatorio temprano · 2 = recordatorio urgente.
 * El día 0 (vencimiento) se maneja aparte: marca la org como `expired`.
 */
export const REMINDER_DAYS = [7, 2] as const;

export const PLAN_PRICES_CLP: Record<Plan, number> = {
  basico: 29000,
  pro: 79000,
  enterprise: 149000,
};

export const PLAN_LABELS: Record<Plan, string> = {
  basico: "Básico",
  pro: "Pro",
  enterprise: "Enterprise",
};

/**
 * Límites blandos por plan. Aún NO se hacen enforcement en código —
 * solo se usan como referencia en la UI de pricing y uploader de seats.
 */
export const PLAN_LIMITS: Record<
  Plan,
  { teamSeats: number | null; patients: number | null }
> = {
  basico: { teamSeats: 1, patients: 50 },
  pro: { teamSeats: 5, patients: null },
  enterprise: { teamSeats: null, patients: null },
};

export type { Plan, SubscriptionStatus };
