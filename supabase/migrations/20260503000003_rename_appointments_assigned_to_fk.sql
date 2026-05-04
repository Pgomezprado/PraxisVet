-- ============================================
-- Renombrar FK de appointments para alinear con el nombre de la columna
-- ============================================
-- La migración 20260412000001_clinic_flow_alignment.sql renombró
-- appointments.vet_id → appointments.assigned_to, pero PostgreSQL no
-- renombra automáticamente el constraint cuando se renombra la columna.
-- El FK quedó como `appointments_vet_id_fkey`, lo que rompe los hints
-- explícitos en queries de Supabase con sintaxis !appointments_assigned_to_fkey.
--
-- Esto afectaba silenciosamente a queries.ts del portal del tutor (líneas
-- 94 y 250) que usaban el hint nuevo y devolvían null en el join — el portal
-- no rompía pero perdía el nombre del veterinario asignado.
--
-- Esta migración alinea el nombre del constraint con la columna actual.
-- Idempotente: usa DO con verificación de existencia.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.appointments'::regclass
      AND conname = 'appointments_vet_id_fkey'
  ) THEN
    ALTER TABLE public.appointments
      RENAME CONSTRAINT appointments_vet_id_fkey
      TO appointments_assigned_to_fkey;
  END IF;
END$$;

-- Forzar recarga del schema cache de PostgREST.
NOTIFY pgrst, 'reload schema';
