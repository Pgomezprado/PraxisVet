-- ============================================
-- Migration: Species clinical taxonomy
-- ============================================
-- Feedback de la primera entrega del MVP (2026-04-15):
-- los veterinarios usan taxonomía clínica (canino / felino / exótico),
-- no lenguaje coloquial (perro / gato). Reemplazamos los valores del
-- CHECK constraint en pets.species y migramos los datos existentes.
--
-- Mapeo:
--   dog                              -> canino
--   cat                              -> felino
--   bird, rabbit, reptile, other     -> exotico
--
-- Nota: todavía no subdividimos "exotico" (ave, conejo, reptil, etc.)
-- porque está pendiente validar la subdivisión con la clínica.

BEGIN;

-- 1) Quitar el CHECK existente sobre pets.species. El nombre fue autogenerado
--    por Postgres ("pets_species_check") al crear la tabla.
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_species_check;

-- 2) Migrar datos existentes al vocabulario clínico.
UPDATE public.pets
SET species = CASE species
  WHEN 'dog'     THEN 'canino'
  WHEN 'cat'     THEN 'felino'
  WHEN 'bird'    THEN 'exotico'
  WHEN 'rabbit'  THEN 'exotico'
  WHEN 'reptile' THEN 'exotico'
  WHEN 'other'   THEN 'exotico'
  ELSE species
END
WHERE species IS NOT NULL;

-- 3) Recrear el CHECK con la nueva taxonomía.
ALTER TABLE public.pets
  ADD CONSTRAINT pets_species_check
  CHECK (species IN ('canino', 'felino', 'exotico'));

COMMIT;
