-- ============================================
-- Migration: Team management — profile-only members
-- ============================================
-- Permite crear miembros sin cuenta de login (user_id = NULL).
-- Un "profile-only member" es un peluquero, vet o recepcionista que aparece
-- en dropdowns (agenda, asignación de citas) pero no puede autenticarse.
-- El admin gestiona todo por ellos. Un profile-only se puede "promover" a
-- login user más adelante vinculando un user_id via invitación por email.

-- ============================================
-- 1) Relax user_id constraint
-- ============================================
ALTER TABLE public.organization_members
  ALTER COLUMN user_id DROP NOT NULL;

-- ============================================
-- 2) Índice parcial para búsqueda rápida por user_id cuando exista
-- ============================================
-- El índice existente idx_org_members_user_id cubre toda la columna.
-- Un índice parcial es más eficiente cuando user_id es NULL con frecuencia.
DROP INDEX IF EXISTS public.idx_org_members_user_id;
CREATE INDEX idx_org_members_user_id
  ON public.organization_members (user_id)
  WHERE user_id IS NOT NULL;

-- ============================================
-- 3) Nombre obligatorio — si no hay user_id, al menos debe haber nombre
-- ============================================
-- Garantiza que todo miembro tenga algún identificador humano.
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_identity_check
  CHECK (
    user_id IS NOT NULL
    OR (first_name IS NOT NULL AND length(trim(first_name)) > 0)
  );
