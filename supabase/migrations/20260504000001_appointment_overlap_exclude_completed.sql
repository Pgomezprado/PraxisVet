-- ============================================
-- Excluir 'completed' del constraint de solapamiento de citas.
-- ============================================
-- Reportado por Paws & Hair (vet) 2026-05-03: cuando una cita queda en
-- 'completed', el horario sigue marcado como ocupado en DB y bloquea
-- agendar otra cita en ese mismo slot. Una cita completada ya no es
-- "activa" desde el punto de vista operativo, así que no debería
-- bloquear horario futuro al mismo profesional.
--
-- El check de aplicación en lib/auth/check-availability.ts ya excluye
-- 'completed' (no está en ACTIVE_APPOINTMENT_STATUSES); ajustamos el
-- constraint de DB para que sea coherente.
-- ============================================

BEGIN;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_no_overlap;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap EXCLUDE USING gist (
    assigned_to WITH =,
    date WITH =,
    tsrange(
      ('2000-01-01'::date + start_time)::timestamp,
      ('2000-01-01'::date + end_time)::timestamp
    ) WITH &&
  )
  WHERE (status NOT IN ('cancelled', 'no_show', 'completed'));

COMMIT;
