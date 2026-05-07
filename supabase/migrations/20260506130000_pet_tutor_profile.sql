-- Bloque 3d — Perfil enriquecido del tutor para su mascota.
--
-- En el modo "tutor sin clínica", el dueño construye un perfil rico de su
-- regalón: alimento, juguetes, paseos, personalidad, alergias. La idea es
-- que la app use ese perfil para sugerir lo mejor (Mall, Viajes, Belleza).
--
-- Decisión: usar un único campo `pets.tutor_profile jsonb` para iterar
-- rápido. Cuando los campos se estabilicen y necesitemos queries fuertes,
-- migramos a columnas dedicadas.

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS tutor_profile jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.pets.tutor_profile IS
  'Perfil enriquecido escrito por el tutor en el hub /mascotas. Estructura libre tipo: { nickname, personality, food_brand, food_notes, favorite_toy, favorite_treat, walk_routine, allergies, likes, dislikes }. Solo se usa en modo personal (org.is_personal=true) — la clínica usa su propio campo notes.';
