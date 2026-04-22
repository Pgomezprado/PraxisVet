-- ============================================
-- Sprint 4 · Exclusion constraint para evitar citas solapadas.
-- ============================================
-- Cubre el TOCTOU race en createAppointment: antes existía un gap entre
-- checkMemberAvailability (read) y el INSERT, donde dos requests concurrentes
-- podían crear citas solapadas al mismo profesional.
--
-- Con este constraint, el segundo INSERT falla con 23P01 (exclusion_violation).
-- El código de appointments/actions.ts mapea ese error a mensaje amigable.
-- ============================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Citas activas no pueden solaparse para un mismo profesional.
-- Status canceladas/no_show NO cuentan (WHERE clause filtra).
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap EXCLUDE USING gist (
    assigned_to WITH =,
    date WITH =,
    tsrange(
      ('2000-01-01'::date + start_time)::timestamp,
      ('2000-01-01'::date + end_time)::timestamp
    ) WITH &&
  )
  WHERE (status NOT IN ('cancelled', 'no_show'));

COMMIT;
