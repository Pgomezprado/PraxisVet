-- ============================================
-- grooming_records: restringir SELECT/INSERT/UPDATE/DELETE por rol
-- ============================================
-- Bug detectado 2026-04-19: la vet pudo entrar al detalle de un servicio
-- de peluquería navegando por URL. La policy actual sobre grooming_records
-- es solo "org_isolation" (FOR ALL) → cualquier miembro de la org lee y
-- escribe. Eso viola la invariante #1 (RLS como fuente de verdad) y la
-- separación médico/peluquería declarada en CLAUDE.md / CLINIC_FLOW.md
-- sección 5: grooming_records visible a admin + groomer; receptionist y
-- vet NO ven el contenido.
--
-- Patrón idéntico al hotfix 20260417000000 sobre dewormings: 4 policies
-- explícitas (select/insert/update/delete), todas check de admin/groomer.
-- ============================================

BEGIN;

DROP POLICY IF EXISTS "org_isolation" ON public.grooming_records;
DROP POLICY IF EXISTS "grooming_records_select" ON public.grooming_records;
DROP POLICY IF EXISTS "grooming_records_insert" ON public.grooming_records;
DROP POLICY IF EXISTS "grooming_records_update" ON public.grooming_records;
DROP POLICY IF EXISTS "grooming_records_delete" ON public.grooming_records;

CREATE POLICY "grooming_records_select"
  ON public.grooming_records
  FOR SELECT
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin', 'groomer']));

CREATE POLICY "grooming_records_insert"
  ON public.grooming_records
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin', 'groomer']));

CREATE POLICY "grooming_records_update"
  ON public.grooming_records
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin', 'groomer']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin', 'groomer']));

CREATE POLICY "grooming_records_delete"
  ON public.grooming_records
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin', 'groomer']));

COMMIT;
