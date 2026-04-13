-- ============================================
-- Migration: Clinic Flow Alignment (Pass 1)
-- ============================================
-- Alinea el schema con docs/CLINIC_FLOW.md y docs/SCHEMA_ADDENDUM.md.
-- Cubre brechas 1, 2, 3, 4a y 5a. Las brechas 4 (billing SII completo)
-- y 5b (cash_registers) quedan para una pasada posterior.
--
-- Cambios aditivos excepto: rename appointments.vet_id -> assigned_to.

-- ============================================
-- Brecha 1: rol 'groomer' (peluquero)
-- ============================================
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('admin', 'vet', 'receptionist', 'groomer'));

-- ============================================
-- Brecha 2: appointments soporta peluqueria
-- ============================================

-- 2a) Rename vet_id -> assigned_to (ahora puede ser vet o peluquero)
ALTER TABLE public.appointments
  RENAME COLUMN vet_id TO assigned_to;

-- 2b) Renombrar indice para reflejar el nuevo nombre
ALTER INDEX IF EXISTS public.idx_appointments_vet_id
  RENAME TO idx_appointments_assigned_to;

-- 2c) Tipo de cita: medica o peluqueria
ALTER TABLE public.appointments
  ADD COLUMN type text NOT NULL DEFAULT 'medical'
  CHECK (type IN ('medical', 'grooming'));

-- 2d) Nuevo estado 'ready_for_pickup' (flujo peluqueria: animal listo, pendiente cobro)
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN (
    'pending',
    'confirmed',
    'in_progress',
    'ready_for_pickup',
    'completed',
    'cancelled',
    'no_show'
  ));

-- ============================================
-- Brecha 3: grooming_records (separadas de clinical_records)
-- ============================================
-- Notas opcionales del peluquero sobre el animal. NO visible al veterinario
-- en la misma tabla que historia clinica, separacion estricta de RLS.
CREATE TABLE public.grooming_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  groomer_id uuid REFERENCES public.organization_members(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  service_performed text,
  observations text,
  products_used jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_grooming_records_org_id ON public.grooming_records (org_id);
CREATE INDEX idx_grooming_records_pet_id ON public.grooming_records (pet_id);
CREATE INDEX idx_grooming_records_appointment_id ON public.grooming_records (appointment_id);

ALTER TABLE public.grooming_records ENABLE ROW LEVEL SECURITY;

-- Aislamiento por org. La separacion por rol (peluquero no ve clinical_records,
-- veterinario ve grooming_records en modo lectura) se afina en la pasada de
-- RLS por rol cuando introduzcamos el enforcement de roles a nivel de policies.
CREATE POLICY "org_isolation" ON public.grooming_records
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

-- ============================================
-- Brecha 4a: RUT del cliente (Chile)
-- ============================================
ALTER TABLE public.clients
  ADD COLUMN rut text;

-- Indice parcial para busqueda por RUT cuando este presente
CREATE INDEX idx_clients_rut ON public.clients (org_id, rut) WHERE rut IS NOT NULL;

-- ============================================
-- Brecha 5a: receta retenida (psicotropicos, normativa Chile)
-- ============================================
ALTER TABLE public.prescriptions
  ADD COLUMN is_retained boolean NOT NULL DEFAULT false,
  ADD COLUMN retained_copy_url text;
