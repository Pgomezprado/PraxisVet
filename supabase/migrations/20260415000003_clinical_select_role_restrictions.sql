-- ============================================
-- Clinical tables: restringir SELECT por rol
-- ============================================
-- Bug de seguridad detectado 2026-04-15:
-- Las políticas SELECT de clinical_records, vaccinations y prescriptions
-- estaban abiertas a "cualquier miembro de la org", incluyendo groomer.
-- Esto viola la invariante arquitectónica #1 (AGENTS.md) y el test de
-- seguridad obligatorio de QA:
--   "Peluquero intenta GET /api/clinical_records/:id → debe recibir 403"
--
-- Matriz objetivo (ver CLINIC_FLOW.md sección 5):
--
--   clinical_records (anamnesis, dx, tratamiento)
--     admin ✓ | vet ✓ | receptionist ✗ | groomer ✗
--
--   vaccinations (próxima dosis necesaria para recordatorios)
--     admin ✓ | vet ✓ | receptionist ✓ | groomer ✗
--
--   prescriptions (estado necesario para entrega en mostrador)
--     admin ✓ | vet ✓ | receptionist ✓ | groomer ✗
-- ============================================

-- clinical_records: solo admin + vet
DROP POLICY IF EXISTS "clinical_records_select" ON public.clinical_records;
CREATE POLICY "clinical_records_select"
  ON public.clinical_records
  FOR SELECT
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']));

-- vaccinations: admin + vet + receptionist
DROP POLICY IF EXISTS "vaccinations_select" ON public.vaccinations;
CREATE POLICY "vaccinations_select"
  ON public.vaccinations
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_role_in_org(org_id, ARRAY['admin', 'vet', 'receptionist'])
  );

-- prescriptions: admin + vet + receptionist
DROP POLICY IF EXISTS "prescriptions_select" ON public.prescriptions;
CREATE POLICY "prescriptions_select"
  ON public.prescriptions
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_role_in_org(org_id, ARRAY['admin', 'vet', 'receptionist'])
  );
