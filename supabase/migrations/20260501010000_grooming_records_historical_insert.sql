-- ============================================
-- grooming_records: permitir INSERT histórico al recepcionista
-- ============================================
-- Solicitud Pablo (2026-05-01): al onboardear un nuevo tutor + mascota,
-- la persona que crea los datos (admin o recepcionista) debe poder
-- registrar peluquería histórica del animal sin necesidad de cambiar
-- de rol al groomer.
--
-- Decisión: abrir SOLO INSERT al recepcionista. SELECT/UPDATE/DELETE
-- permanecen restringidos a admin+groomer para no romper la separación
-- médico/peluquería declarada en CLAUDE.md sección 5 (el recepcionista
-- "solo sabe que existe para cobrar, no su contenido").
--
-- Trade-off aceptado: el recepcionista puede crear un registro pero no
-- volver a verlo ni editarlo. Si necesita corregirlo, le pide a un
-- admin o groomer. Es una superficie deliberadamente delgada solo para
-- captura histórica en onboarding.
-- ============================================

BEGIN;

DROP POLICY IF EXISTS "grooming_records_insert" ON public.grooming_records;

CREATE POLICY "grooming_records_insert"
  ON public.grooming_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_role_in_org(org_id, ARRAY['admin', 'groomer', 'receptionist'])
  );

COMMIT;
