-- ============================================
-- Pets: auditoría (updated_at / updated_by) y RLS por rol
-- ============================================
-- Contexto: la recepcionista necesita poder editar identidad de la mascota
-- (nombre, especie, raza, microchip, notas administrativas). Ya estaba
-- permitido por RLS, pero no se excluía al peluquero, y no había auditoría.
--
-- Matriz objetivo (ver reunión 2026-04-15):
--   admin       → CRUD
--   vet         → CRUD
--   receptionist→ C + U  (no delete)
--   groomer     → solo SELECT
-- ============================================

-- 1. Columnas de auditoría
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Trigger que mantiene updated_at y updated_by automáticamente
--    (evita que el cliente tenga que acordarse y previene manipulación)
CREATE OR REPLACE FUNCTION public.pets_set_updated_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pets_set_updated_metadata ON public.pets;
CREATE TRIGGER trg_pets_set_updated_metadata
  BEFORE INSERT OR UPDATE ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION public.pets_set_updated_metadata();

-- 3. Tightening de RLS: excluir groomer de escritura
DROP POLICY IF EXISTS "pets_insert" ON public.pets;
DROP POLICY IF EXISTS "pets_update" ON public.pets;

CREATE POLICY "pets_insert"
  ON public.pets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_role_in_org(org_id, ARRAY['admin', 'vet', 'receptionist'])
  );

CREATE POLICY "pets_update"
  ON public.pets
  FOR UPDATE
  TO authenticated
  USING (
    public.user_has_role_in_org(org_id, ARRAY['admin', 'vet', 'receptionist'])
  )
  WITH CHECK (
    public.user_has_role_in_org(org_id, ARRAY['admin', 'vet', 'receptionist'])
  );

-- pets_select y pets_delete se mantienen como estaban:
--   select → cualquier miembro de la org (incluye groomer, correcto)
--   delete → solo admin (correcto)

COMMENT ON COLUMN public.pets.updated_by IS
  'Usuario que realizó la última modificación. Seteado automáticamente por trigger.';
