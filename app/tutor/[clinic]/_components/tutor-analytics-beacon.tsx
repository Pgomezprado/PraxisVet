"use client";

import { useEffect, useRef } from "react";
import { hashTutorId, trackTutorEvent } from "@/lib/analytics/tutor-events";

type Props = {
  event:
    | "tutor_portal_opened"
    | "tutor_pet_viewed"
    | "tutor_history_viewed"
    | "tutor_healthcard_public_viewed";
  clinicSlug: string;
  tutorId?: string | null;
  petId?: string | null;
};

/**
 * Dispara un evento de analytics una sola vez al montar.
 * Pensado para usarse desde Server Components que pasan los IDs ya resueltos.
 */
export function TutorAnalyticsBeacon({
  event,
  clinicSlug,
  tutorId,
  petId,
}: Props) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackTutorEvent(event, {
      clinic_slug: clinicSlug,
      tutor_id: tutorId ? hashTutorId(tutorId) : null,
      pet_id: petId ?? null,
    });
  }, [event, clinicSlug, tutorId, petId]);

  return null;
}
