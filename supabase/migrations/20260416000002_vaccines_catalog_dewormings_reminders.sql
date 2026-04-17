-- ============================================
-- Migration: Vaccine catalog, protocols, dewormings, reminders
-- ============================================
-- Basado en el Excel enviado por la clínica de referencia (2026-04-16).
-- Introduce:
--   1) Catálogo global de vacunas + protocolos + dosis ordenadas (sin org_id).
--   2) Override por clínica (organization_vaccine_preferences) para opt-out.
--   3) Columnas nuevas en vaccinations para vincular al protocolo/dosis.
--   4) Constantes fisiológicas adicionales en clinical_records.
--   5) Tabla dewormings con RLS por rol (admin/vet) igual que clinical_records.
--   6) Tabla reminders alimentada por triggers.
--   7) Triggers de auto-cálculo de next_due_date y creación de recordatorios.
--
-- Invariantes:
--   - Catálogo es GLOBAL (no tiene org_id). Se lee siempre, se filtra con
--     organization_vaccine_preferences.is_disabled para opt-out.
--   - dewormings sigue el patrón de clinical_records:
--       SELECT  → admin + vet (groomer NO)
--       INSERT/UPDATE/DELETE → org_isolation (admin + vet vía SELECT)
--   - reminders sigue org_isolation estándar.
-- ============================================

BEGIN;

-- ============================================================
-- 1) Catálogo global de vacunas
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vaccines_catalog (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  species text[] NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT vaccines_catalog_species_valid
    CHECK (species <@ ARRAY['canino', 'felino', 'exotico']::text[])
);

ALTER TABLE public.vaccines_catalog ENABLE ROW LEVEL SECURITY;

-- Lectura global para cualquier usuario autenticado (es catálogo).
DROP POLICY IF EXISTS "vaccines_catalog_select" ON public.vaccines_catalog;
CREATE POLICY "vaccines_catalog_select"
  ON public.vaccines_catalog
  FOR SELECT
  TO authenticated
  USING (true);

-- Escritura solo service_role (seeding). authenticated no escribe.

-- ============================================================
-- 2) Protocolos de vacunación (global)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vaccine_protocols (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  vaccine_id uuid NOT NULL REFERENCES public.vaccines_catalog(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  species text NOT NULL CHECK (species IN ('canino', 'felino', 'exotico')),
  life_stage text NOT NULL CHECK (life_stage IN ('puppy', 'kitten', 'adulto', 'anual')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vaccine_protocols_vaccine_id
  ON public.vaccine_protocols (vaccine_id);

ALTER TABLE public.vaccine_protocols ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vaccine_protocols_select" ON public.vaccine_protocols;
CREATE POLICY "vaccine_protocols_select"
  ON public.vaccine_protocols
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 3) Dosis por protocolo (global)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vaccine_protocol_doses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_id uuid NOT NULL REFERENCES public.vaccine_protocols(id) ON DELETE CASCADE,
  sequence int NOT NULL CHECK (sequence >= 1),
  name text NOT NULL,
  interval_days int NOT NULL CHECK (interval_days > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE (protocol_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_vaccine_protocol_doses_protocol_id
  ON public.vaccine_protocol_doses (protocol_id);

ALTER TABLE public.vaccine_protocol_doses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vaccine_protocol_doses_select" ON public.vaccine_protocol_doses;
CREATE POLICY "vaccine_protocol_doses_select"
  ON public.vaccine_protocol_doses
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 4) Override por clínica (opt-out)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.organization_vaccine_preferences (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vaccine_id uuid NOT NULL REFERENCES public.vaccines_catalog(id) ON DELETE CASCADE,
  is_disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (org_id, vaccine_id)
);

ALTER TABLE public.organization_vaccine_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_isolation" ON public.organization_vaccine_preferences;
CREATE POLICY "org_isolation"
  ON public.organization_vaccine_preferences
  FOR ALL
  TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

-- ============================================================
-- 5) vaccinations: columnas nuevas
-- ============================================================

ALTER TABLE public.vaccinations
  ADD COLUMN IF NOT EXISTS protocol_id uuid
    REFERENCES public.vaccine_protocols(id) ON DELETE SET NULL;

ALTER TABLE public.vaccinations
  ADD COLUMN IF NOT EXISTS dose_id uuid
    REFERENCES public.vaccine_protocol_doses(id) ON DELETE SET NULL;

ALTER TABLE public.vaccinations
  ADD COLUMN IF NOT EXISTS vaccine_catalog_id uuid
    REFERENCES public.vaccines_catalog(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vaccinations_protocol_id
  ON public.vaccinations (protocol_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_dose_id
  ON public.vaccinations (dose_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_vaccine_catalog_id
  ON public.vaccinations (vaccine_catalog_id);

-- ============================================================
-- 6) clinical_records: constantes fisiológicas extra
-- ============================================================

ALTER TABLE public.clinical_records
  ADD COLUMN IF NOT EXISTS respiratory_rate int
    CHECK (respiratory_rate IS NULL OR respiratory_rate > 0);

ALTER TABLE public.clinical_records
  ADD COLUMN IF NOT EXISTS capillary_refill_seconds numeric(3,1)
    CHECK (capillary_refill_seconds IS NULL OR capillary_refill_seconds >= 0);

ALTER TABLE public.clinical_records
  ADD COLUMN IF NOT EXISTS skin_fold_seconds numeric(3,1)
    CHECK (skin_fold_seconds IS NULL OR skin_fold_seconds >= 0);

ALTER TABLE public.clinical_records
  ADD COLUMN IF NOT EXISTS physical_exam jsonb;

-- ============================================================
-- 7) dewormings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dewormings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  clinical_record_id uuid REFERENCES public.clinical_records(id) ON DELETE SET NULL,
  vet_id uuid REFERENCES public.organization_members(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('interna', 'externa')),
  date_administered date NOT NULL DEFAULT CURRENT_DATE,
  product text,
  next_due_date date,
  pregnant_cohabitation boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dewormings_org_id ON public.dewormings (org_id);
CREATE INDEX IF NOT EXISTS idx_dewormings_pet_id ON public.dewormings (pet_id);

ALTER TABLE public.dewormings ENABLE ROW LEVEL SECURITY;

-- Base: org_isolation para INSERT/UPDATE/DELETE (ALL).
DROP POLICY IF EXISTS "org_isolation" ON public.dewormings;
CREATE POLICY "org_isolation"
  ON public.dewormings
  FOR ALL
  TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

-- SELECT restringido a admin + vet (groomer NO, como clinical_records).
DROP POLICY IF EXISTS "dewormings_select" ON public.dewormings;
CREATE POLICY "dewormings_select"
  ON public.dewormings
  FOR SELECT
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin', 'vet']));

-- ============================================================
-- 8) reminders
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('vaccination', 'deworming', 'appointment')),
  source_table text,
  source_id uuid,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'done', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_org_id ON public.reminders (org_id);
CREATE INDEX IF NOT EXISTS idx_reminders_pet_id ON public.reminders (pet_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON public.reminders (due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_source
  ON public.reminders (source_table, source_id);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_isolation" ON public.reminders;
CREATE POLICY "org_isolation"
  ON public.reminders
  FOR ALL
  TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

-- ============================================================
-- 9) Trigger: auto-calcular vaccinations.next_due_date desde dose_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.vaccinations_calc_next_due_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_interval int;
BEGIN
  -- Solo auto-calcula si el caller no envió next_due_date y hay dose_id.
  IF NEW.next_due_date IS NULL AND NEW.dose_id IS NOT NULL THEN
    SELECT interval_days INTO v_interval
    FROM public.vaccine_protocol_doses
    WHERE id = NEW.dose_id;

    IF v_interval IS NOT NULL THEN
      NEW.next_due_date := NEW.date_administered + (v_interval || ' days')::interval;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vaccinations_calc_next_due_date
  ON public.vaccinations;
CREATE TRIGGER trg_vaccinations_calc_next_due_date
  BEFORE INSERT OR UPDATE ON public.vaccinations
  FOR EACH ROW
  EXECUTE FUNCTION public.vaccinations_calc_next_due_date();

-- ============================================================
-- 10) Trigger: auto-calcular dewormings.next_due_date
-- ============================================================

CREATE OR REPLACE FUNCTION public.dewormings_calc_next_due_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_days int;
BEGIN
  IF NEW.next_due_date IS NULL THEN
    IF NEW.type = 'interna' THEN
      v_days := CASE WHEN NEW.pregnant_cohabitation THEN 30 ELSE 90 END;
    ELSE
      v_days := 30;
    END IF;
    NEW.next_due_date := NEW.date_administered + (v_days || ' days')::interval;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dewormings_calc_next_due_date
  ON public.dewormings;
CREATE TRIGGER trg_dewormings_calc_next_due_date
  BEFORE INSERT OR UPDATE ON public.dewormings
  FOR EACH ROW
  EXECUTE FUNCTION public.dewormings_calc_next_due_date();

-- ============================================================
-- 11) Trigger: crear reminder al insertar vaccination/deworming
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_reminder_from_vaccination()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.next_due_date IS NOT NULL THEN
    INSERT INTO public.reminders (org_id, pet_id, type, source_table, source_id, due_date, status)
    VALUES (NEW.org_id, NEW.pet_id, 'vaccination', 'vaccinations', NEW.id, NEW.next_due_date, 'pending');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vaccinations_create_reminder
  ON public.vaccinations;
CREATE TRIGGER trg_vaccinations_create_reminder
  AFTER INSERT ON public.vaccinations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_reminder_from_vaccination();

CREATE OR REPLACE FUNCTION public.create_reminder_from_deworming()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.next_due_date IS NOT NULL THEN
    INSERT INTO public.reminders (org_id, pet_id, type, source_table, source_id, due_date, status)
    VALUES (NEW.org_id, NEW.pet_id, 'deworming', 'dewormings', NEW.id, NEW.next_due_date, 'pending');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dewormings_create_reminder
  ON public.dewormings;
CREATE TRIGGER trg_dewormings_create_reminder
  AFTER INSERT ON public.dewormings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_reminder_from_deworming();

COMMIT;
