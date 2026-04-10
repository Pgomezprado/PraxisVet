-- ============================================
-- Migration 3: Clients & Pets
-- ============================================

CREATE TABLE public.clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_clients_org_id ON public.clients (org_id);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.clients
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

-- ---

CREATE TABLE public.pets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  species text CHECK (species IN ('dog', 'cat', 'bird', 'rabbit', 'reptile', 'other')),
  breed text,
  color text,
  sex text CHECK (sex IN ('male', 'female')),
  birthdate date,
  microchip text,
  photo_url text,
  notes text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_pets_org_id ON public.pets (org_id);
CREATE INDEX idx_pets_client_id ON public.pets (client_id);

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.pets
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());
