-- ============================================
-- Migration 5: Clinical Records, Vaccinations, Prescriptions, Attachments
-- ============================================

CREATE TABLE public.clinical_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  vet_id uuid NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  anamnesis text,
  symptoms text,
  diagnosis text,
  treatment text,
  observations text,
  weight numeric(5,2),
  temperature numeric(4,1),
  heart_rate int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_clinical_records_org_id ON public.clinical_records (org_id);
CREATE INDEX idx_clinical_records_pet_id ON public.clinical_records (pet_id);

ALTER TABLE public.clinical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.clinical_records
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

-- ---

CREATE TABLE public.vaccinations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  clinical_record_id uuid REFERENCES public.clinical_records(id) ON DELETE SET NULL,
  vaccine_name text NOT NULL,
  lot_number text,
  date_administered date NOT NULL DEFAULT CURRENT_DATE,
  next_due_date date,
  vet_id uuid REFERENCES public.organization_members(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_vaccinations_org_id ON public.vaccinations (org_id);
CREATE INDEX idx_vaccinations_pet_id ON public.vaccinations (pet_id);

ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.vaccinations
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

-- ---

CREATE TABLE public.prescriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  clinical_record_id uuid NOT NULL REFERENCES public.clinical_records(id) ON DELETE CASCADE,
  medication text NOT NULL,
  dose text,
  frequency text,
  duration text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_prescriptions_org_id ON public.prescriptions (org_id);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.prescriptions
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

-- ---

CREATE TABLE public.attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('pet', 'clinical_record', 'appointment')),
  entity_id uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_attachments_org_id ON public.attachments (org_id);
CREATE INDEX idx_attachments_entity ON public.attachments (entity_type, entity_id);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.attachments
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());
