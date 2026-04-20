-- ============================================
-- Relajar policies DELETE según workflow real de clínica
-- ============================================
-- Feedback de la veterinaria fundadora (2026-04-19):
-- "No me elimina nada cuando le digo que elimine, ni las citas ni
--  registros". Diagnóstico: las policies DELETE de appointments y
--  clinical_records exigían rol 'admin', pero quien usa el sistema
--  día a día son vet y receptionist. RLS filtra silenciosamente
--  (0 filas) sin error → la UI cree que eliminó pero no.
--
-- Decisión de negocio (CoFounder):
--   - appointments: cualquier miembro (admin + vet + receptionist) puede
--     eliminar citas. Recepcionista cancela rutinariamente; vet también
--     necesita reagendar. Un peluquero NO debería eliminar citas médicas
--     pero el flujo actual rara vez lo expone (el groomer solo ve sus
--     citas tipo grooming en su dashboard). Ampliamos a 3 roles.
--   - clinical_records: admin + vet. Vet borra su propia ficha si erró.
--   - clients y pets siguen admin-only: el cascade es destructivo
--     (borra historial, citas, fichas, vacunas). Cambio peligroso.
-- ============================================

BEGIN;

-- Appointments: admin + vet + receptionist
DROP POLICY IF EXISTS "appointments_delete" ON public.appointments;
CREATE POLICY "appointments_delete"
  ON public.appointments
  FOR DELETE
  TO authenticated
  USING (
    public.user_has_role_in_org(org_id, ARRAY['admin', 'vet', 'receptionist'])
  );

-- Clinical records: admin + vet
DROP POLICY IF EXISTS "clinical_records_delete" ON public.clinical_records;
CREATE POLICY "clinical_records_delete"
  ON public.clinical_records
  FOR DELETE
  TO authenticated
  USING (
    public.user_has_role_in_org(org_id, ARRAY['admin', 'vet'])
  );

COMMIT;
