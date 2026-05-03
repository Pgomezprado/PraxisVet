-- ============================================
-- Capabilities → acceso completo a grooming_records
-- ============================================
-- Decisión 2026-05-03: una vet con `can_groom` debe poder VER, CREAR,
-- EDITAR y ELIMINAR registros de peluquería igual que un peluquero.
--
-- Caso real (Paws & Hair, primera fundadora): Francisca es veterinaria y
-- también atiende peluquería. Hoy el sistema la bloquea con 404 al intentar
-- abrir el detalle/edit de un servicio de peluquería que ella misma realizó.
--
-- ESTO SUPERA la advertencia CI-160 #11 de la doc original ("capabilities
-- solo afectan agendamiento") — la decisión de producto se documenta y la
-- invariante queda actualizada en AGENTS.md por separado.
--
-- Helper nuevo: `user_has_capability_in_org(org, cap)` — true si el usuario
-- tiene un rol que cubre la capability O tiene fila explícita en
-- member_capabilities. Reusable para cuando se haga el inverso (groomer con
-- can_vet → clinical_records).
-- ============================================

BEGIN;

-- ROLE_COVERS_CAPABILITY (espejo de lib/auth/capabilities.ts):
--   can_vet   → admin, vet
--   can_groom → admin, groomer
CREATE OR REPLACE FUNCTION public.user_has_capability_in_org(
  check_org_id uuid,
  cap text
)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.org_id = check_org_id
      AND om.active = true
      AND (
        (cap = 'can_vet' AND om.role IN ('admin', 'vet'))
        OR (cap = 'can_groom' AND om.role IN ('admin', 'groomer'))
        OR EXISTS (
          SELECT 1 FROM public.member_capabilities mc
          WHERE mc.member_id = om.id
            AND mc.capability::text = cap
        )
      )
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- Reemplazar las 4 policies de grooming_records
-- ============================================
-- Antes: user_has_role_in_org(..., ARRAY['admin','groomer']) — excluía a la
-- vet con can_groom. Ahora delegamos al helper de capability, que ya cubre
-- admin/groomer por rol Y suma los miembros con can_groom explícito.

DROP POLICY IF EXISTS "grooming_records_select" ON public.grooming_records;
DROP POLICY IF EXISTS "grooming_records_insert" ON public.grooming_records;
DROP POLICY IF EXISTS "grooming_records_update" ON public.grooming_records;
DROP POLICY IF EXISTS "grooming_records_delete" ON public.grooming_records;

CREATE POLICY "grooming_records_select"
  ON public.grooming_records
  FOR SELECT
  TO authenticated
  USING (public.user_has_capability_in_org(org_id, 'can_groom'));

-- INSERT mantiene además al recepcionista para captura histórica de
-- onboarding (decisión 2026-05-01, migración 20260501010000). Se conserva.
CREATE POLICY "grooming_records_insert"
  ON public.grooming_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_capability_in_org(org_id, 'can_groom')
    OR public.user_has_role_in_org(org_id, ARRAY['receptionist'])
  );

CREATE POLICY "grooming_records_update"
  ON public.grooming_records
  FOR UPDATE
  TO authenticated
  USING (public.user_has_capability_in_org(org_id, 'can_groom'))
  WITH CHECK (public.user_has_capability_in_org(org_id, 'can_groom'));

CREATE POLICY "grooming_records_delete"
  ON public.grooming_records
  FOR DELETE
  TO authenticated
  USING (public.user_has_capability_in_org(org_id, 'can_groom'));


COMMIT;
