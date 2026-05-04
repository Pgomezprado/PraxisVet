-- ============================================
-- custom_breeds: catálogo de razas personalizadas por organización
-- ============================================
-- Solicitud Pablo (2026-05-04): la veterinaria quiere agregar razas
-- que no están en el catálogo hardcodeado en lib/constants/breeds.ts
-- (ej: razas regionales, mestizajes específicos, exóticos).
--
-- Diseño:
-- - Tabla por organización con (org_id, species, name).
-- - El catálogo TS se mantiene como base global; estas filas se MERGEAN
--   en las sugerencias del Combobox del pet-form. La columna pets.breed
--   sigue siendo free-text — esta tabla solo alimenta sugerencias.
-- - RLS: cualquier miembro de la org lee (todos necesitan agendar y
--   abrir fichas), solo admin escribe (es configuración).
-- - Unicidad por org+species+nombre normalizado (lower+unaccent) para
--   evitar duplicados tipo "Beagle"/"beagle"/"Béagle".
-- ============================================

BEGIN;

CREATE TABLE public.custom_breeds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  species text NOT NULL CHECK (species IN ('canino', 'felino', 'exotico')),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  name_normalized text GENERATED ALWAYS AS (
    lower(public.immutable_unaccent(trim(name)))
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX idx_custom_breeds_unique
  ON public.custom_breeds (org_id, species, name_normalized);

CREATE INDEX idx_custom_breeds_org_species
  ON public.custom_breeds (org_id, species);

ALTER TABLE public.custom_breeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_breeds_select"
  ON public.custom_breeds
  FOR SELECT
  TO authenticated
  USING (org_id = public.get_user_org_id());

CREATE POLICY "custom_breeds_insert_admin"
  ON public.custom_breeds
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

CREATE POLICY "custom_breeds_update_admin"
  ON public.custom_breeds
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

CREATE POLICY "custom_breeds_delete_admin"
  ON public.custom_breeds
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

COMMIT;
