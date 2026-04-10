-- ============================================
-- Migration 4: Services & Appointments
-- ============================================

CREATE TABLE public.services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text CHECK (category IN ('consultation', 'surgery', 'grooming', 'vaccine', 'lab', 'imaging', 'other')),
  duration_minutes int DEFAULT 30,
  price numeric(10,2),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_services_org_id ON public.services (org_id);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.services
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

-- ---

CREATE TABLE public.appointments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  vet_id uuid NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  reason text,
  notes text,
  reminder_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_appointments_org_id ON public.appointments (org_id);
CREATE INDEX idx_appointments_date ON public.appointments (org_id, date);
CREATE INDEX idx_appointments_vet_id ON public.appointments (vet_id);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.appointments
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());
