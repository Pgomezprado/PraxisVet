-- ============================================
-- Sprint 4 · Feature 2: Multi-rol vía capabilities (Opción A)
-- ============================================
-- Tabla paralela para expresar "capacidades extra más allá del rol principal".
-- NO migra organization_members.role (columna TEXT singular) — las 38
-- menciones de role en código + RLS siguen funcionando sin cambios.
--
-- Regla de resolución (ver lib/auth/capabilities.ts):
--   Un miembro puede ejecutar una acción de "can_X" si:
--     1. Su role principal ya la cubre (ej: role='vet' implica can_vet), O
--     2. Tiene fila en member_capabilities con esa capability.
--
-- ADVERTENCIA CI-160: NO escribir RLS nueva basada en capabilities sin
-- revisión explícita. Capabilities hoy solo afectan *agendamiento*, NO
-- abren acceso a datos clínicos. La separación médico/peluquería sigue
-- basándose en role hasta que se decida lo contrario.
-- ============================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_capability') THEN
    CREATE TYPE public.member_capability AS ENUM ('can_vet', 'can_groom');
  END IF;
END$$;

CREATE TABLE public.member_capabilities (
  member_id   uuid NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  capability  public.member_capability NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, capability)
);

CREATE INDEX idx_member_capabilities_org ON public.member_capabilities (org_id);

ALTER TABLE public.member_capabilities ENABLE ROW LEVEL SECURITY;

-- Todos los miembros activos de la org pueden leer capabilities (necesario
-- para filtrar profesionales en creación de cita).
CREATE POLICY "member_capabilities_select"
  ON public.member_capabilities
  FOR SELECT
  TO authenticated
  USING (org_id = public.get_user_org_id());

-- Solo admins escriben capabilities.
CREATE POLICY "member_capabilities_insert"
  ON public.member_capabilities
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

CREATE POLICY "member_capabilities_update"
  ON public.member_capabilities
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

CREATE POLICY "member_capabilities_delete"
  ON public.member_capabilities
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

COMMIT;
