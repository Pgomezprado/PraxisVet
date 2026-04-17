-- ============================================
-- Hotfix: RLS leakage + UPDATE/DELETE triggers
-- ============================================
-- QA report (2026-04-17) detectó 3 hallazgos críticos sobre la migración
-- 20260416000002_vaccines_catalog_dewormings_reminders.sql:
--
-- [1] dewormings: la policy FOR ALL (org_isolation) se OR-suma con la
--     policy SELECT restringida → groomers pueden leer. Violación de
--     invariante #1 (RLS como fuente de verdad) y de la separación
--     médico/peluquería (CLINIC_FLOW.md §5).
--
-- [2] reminders: la policy FOR ALL (org_id = get_user_org_id()) permite a
--     groomer/receptionist leer reminders de tipo 'vaccination'/'deworming',
--     revelando la existencia de registros médicos aunque no accedan a la
--     tabla fuente. Fuga de información por canal lateral.
--
-- [3] vaccinations/dewormings: los triggers de reminder sólo disparan en
--     INSERT. Si el vet cambia next_due_date o borra el registro, el
--     reminder queda desactualizado o huérfano.
--
-- Este hotfix:
--   - Rehace las policies de dewormings siguiendo el patrón exacto de
--     clinical_records (SELECT + INSERT + UPDATE + DELETE separadas,
--     todas con check de rol admin/vet).
--   - Rehace las policies de reminders con SELECT condicional por tipo:
--       type='appointment'           → cualquier miembro del org
--       type IN ('vaccination','deworming') → solo admin/vet del org
--     y escritura restringida a admin/vet.
--   - Agrega triggers AFTER UPDATE + BEFORE DELETE en vaccinations y
--     dewormings para mantener reminders consistentes.
-- ============================================

BEGIN;

-- ============================================================
-- 1) dewormings: separar policies por acción (patrón clinical_records)
-- ============================================================

-- La policy FOR ALL se sumaba por OR con la SELECT restringida → groomer
-- conseguía leer. Drop y reemplazo por 4 policies específicas.
DROP POLICY IF EXISTS "org_isolation" ON public.dewormings;
DROP POLICY IF EXISTS "dewormings_select" ON public.dewormings;
DROP POLICY IF EXISTS "dewormings_insert" ON public.dewormings;
DROP POLICY IF EXISTS "dewormings_update" ON public.dewormings;
DROP POLICY IF EXISTS "dewormings_delete" ON public.dewormings;

-- SELECT: solo admin + vet del org (groomer/receptionist excluidos)
CREATE POLICY "dewormings_select"
  ON public.dewormings
  FOR SELECT
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']));

-- INSERT: solo admin + vet del org
CREATE POLICY "dewormings_insert"
  ON public.dewormings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']));

-- UPDATE: solo admin + vet del org
CREATE POLICY "dewormings_update"
  ON public.dewormings
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']));

-- DELETE: solo admin + vet del org
CREATE POLICY "dewormings_delete"
  ON public.dewormings
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']));

-- ============================================================
-- 2) reminders: SELECT condicional por tipo, escritura admin/vet
-- ============================================================

DROP POLICY IF EXISTS "org_isolation" ON public.reminders;
DROP POLICY IF EXISTS "reminders_select" ON public.reminders;
DROP POLICY IF EXISTS "reminders_insert" ON public.reminders;
DROP POLICY IF EXISTS "reminders_update" ON public.reminders;
DROP POLICY IF EXISTS "reminders_delete" ON public.reminders;

-- SELECT:
--   type='appointment'                 → cualquier miembro del org
--   type IN ('vaccination','deworming') → solo admin + vet del org
CREATE POLICY "reminders_select"
  ON public.reminders
  FOR SELECT
  TO authenticated
  USING (
    (
      type = 'appointment'
      AND public.user_belongs_to_org(org_id)
    )
    OR (
      type IN ('vaccination', 'deworming')
      AND public.user_has_role_in_org(org_id, ARRAY['admin', 'vet'])
    )
  );

-- INSERT / UPDATE / DELETE: solo admin + vet del org.
-- Nota: los reminders de 'appointment' los crea el flujo de citas, que
-- actualmente corre con admin/vet/receptionist. Si a futuro se necesita
-- que receptionist escriba reminders 'appointment', se ampliará aquí.
-- El caso inmediato (vaccination/deworming) está cubierto porque los
-- triggers corren con los privilegios del usuario que inserta en la
-- tabla fuente (vaccinations/dewormings), y ésos son admin/vet.
CREATE POLICY "reminders_insert"
  ON public.reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']));

CREATE POLICY "reminders_update"
  ON public.reminders
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']));

CREATE POLICY "reminders_delete"
  ON public.reminders
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']));

-- ============================================================
-- 3) Triggers AFTER UPDATE: mantener reminders sincronizados
-- ============================================================

-- vaccinations
CREATE OR REPLACE FUNCTION public.sync_reminder_from_vaccination_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.next_due_date IS DISTINCT FROM NEW.next_due_date THEN
    IF NEW.next_due_date IS NULL THEN
      -- Fecha removida → eliminar reminder asociado.
      DELETE FROM public.reminders
      WHERE source_table = 'vaccinations'
        AND source_id = NEW.id;
    ELSIF OLD.next_due_date IS NULL THEN
      -- No había reminder previo (OLD era NULL) → crear uno nuevo.
      INSERT INTO public.reminders (
        org_id, pet_id, type, source_table, source_id, due_date, status
      )
      VALUES (
        NEW.org_id, NEW.pet_id, 'vaccination', 'vaccinations',
        NEW.id, NEW.next_due_date, 'pending'
      );
    ELSE
      -- Fecha cambió: actualizar reminder pendiente.
      UPDATE public.reminders
      SET due_date = NEW.next_due_date
      WHERE source_table = 'vaccinations'
        AND source_id = NEW.id
        AND status = 'pending';

      -- Si no había reminder pending pero OLD.next_due_date no era NULL
      -- (fue completado/cancelado), creamos uno nuevo para el ciclo siguiente.
      IF NOT FOUND THEN
        INSERT INTO public.reminders (
          org_id, pet_id, type, source_table, source_id, due_date, status
        )
        VALUES (
          NEW.org_id, NEW.pet_id, 'vaccination', 'vaccinations',
          NEW.id, NEW.next_due_date, 'pending'
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vaccinations_sync_reminder_update
  ON public.vaccinations;
CREATE TRIGGER trg_vaccinations_sync_reminder_update
  AFTER UPDATE ON public.vaccinations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_reminder_from_vaccination_update();

-- dewormings
CREATE OR REPLACE FUNCTION public.sync_reminder_from_deworming_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.next_due_date IS DISTINCT FROM NEW.next_due_date THEN
    IF NEW.next_due_date IS NULL THEN
      DELETE FROM public.reminders
      WHERE source_table = 'dewormings'
        AND source_id = NEW.id;
    ELSIF OLD.next_due_date IS NULL THEN
      INSERT INTO public.reminders (
        org_id, pet_id, type, source_table, source_id, due_date, status
      )
      VALUES (
        NEW.org_id, NEW.pet_id, 'deworming', 'dewormings',
        NEW.id, NEW.next_due_date, 'pending'
      );
    ELSE
      UPDATE public.reminders
      SET due_date = NEW.next_due_date
      WHERE source_table = 'dewormings'
        AND source_id = NEW.id
        AND status = 'pending';

      IF NOT FOUND THEN
        INSERT INTO public.reminders (
          org_id, pet_id, type, source_table, source_id, due_date, status
        )
        VALUES (
          NEW.org_id, NEW.pet_id, 'deworming', 'dewormings',
          NEW.id, NEW.next_due_date, 'pending'
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dewormings_sync_reminder_update
  ON public.dewormings;
CREATE TRIGGER trg_dewormings_sync_reminder_update
  AFTER UPDATE ON public.dewormings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_reminder_from_deworming_update();

-- ============================================================
-- 4) Triggers BEFORE DELETE: limpiar reminders huérfanos
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_reminders_on_vaccination_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.reminders
  WHERE source_table = 'vaccinations'
    AND source_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_vaccinations_delete_reminder
  ON public.vaccinations;
CREATE TRIGGER trg_vaccinations_delete_reminder
  BEFORE DELETE ON public.vaccinations
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_reminders_on_vaccination_delete();

CREATE OR REPLACE FUNCTION public.delete_reminders_on_deworming_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.reminders
  WHERE source_table = 'dewormings'
    AND source_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_dewormings_delete_reminder
  ON public.dewormings;
CREATE TRIGGER trg_dewormings_delete_reminder
  BEFORE DELETE ON public.dewormings
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_reminders_on_deworming_delete();

COMMIT;
