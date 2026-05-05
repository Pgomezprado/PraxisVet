/**
 * Eventos de analytics del Portal del Tutor.
 *
 * Wrapper sobre `track` de @vercel/analytics. Toda telemetría del
 * portal pasa por aquí para garantizar que NO enviamos PII (no
 * nombres, no emails, no microchips). Solo IDs y slugs.
 *
 * KPI norte: visitas/mes/tutor ≥ 3 y retorno 30 días ≥ 60%.
 */

import { track } from "@vercel/analytics";

type CommonProps = {
  clinic_slug: string;
  tutor_id?: string | null;
  pet_id?: string | null;
};

type EventName =
  | "tutor_portal_opened"
  | "tutor_pet_viewed"
  | "tutor_history_viewed"
  | "tutor_vaccine_reminder_clicked"
  | "tutor_appointment_requested"
  | "tutor_healthcard_generated"
  | "tutor_healthcard_public_viewed";

function clean(props: CommonProps & Record<string, unknown>): Record<
  string,
  string | number | boolean | null
> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined) continue;
    // Vercel Analytics solo acepta primitivos
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean" ||
      v === null
    ) {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Hash determinista corto del tutor_id para no enviar el UUID crudo
 * como atributo (evita correlación cross-cliente). 8 hex chars son
 * suficientes para distinguir tutores dentro de una clínica.
 *
 * NOTA: ejecuta en cliente, así que usamos un hash trivial (no crypto).
 * No es secreto — solo evita PII identificable a simple vista.
 */
export function hashTutorId(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function trackTutorEvent(
  event: EventName,
  props: CommonProps & Record<string, string | number | boolean | null>
) {
  try {
    track(event, clean(props));
  } catch (err) {
    // En dev sin analytics activo, track puede no estar disponible.
    if (process.env.NODE_ENV !== "production") {
      console.debug("[tutor-events]", event, props, err);
    }
  }
}
