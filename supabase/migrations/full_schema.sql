-- ============================================
-- Migration 1: Organizations (tenants)
-- ============================================

CREATE TABLE public.organizations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  plan text DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  email text,
  phone text,
  address text,
  logo_url text,
  settings jsonb DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_organizations_slug ON public.organizations (slug);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can create an org (for onboarding)
CREATE POLICY "authenticated_users_can_create_orgs"
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Members can read their own org
CREATE POLICY "members_can_read_own_org"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Admins can update their own org
CREATE POLICY "admins_can_update_own_org"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND active = true
    )
  );

-- Allow anyone to check slug availability (for onboarding)
CREATE POLICY "anyone_can_check_slug"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (true);
-- ============================================
-- Migration 2: Organization Members + Helper Function
-- ============================================

CREATE TABLE public.organization_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'vet', 'receptionist')),
  first_name text,
  last_name text,
  specialty text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX idx_org_members_user_id ON public.organization_members (user_id);
CREATE INDEX idx_org_members_org_id ON public.organization_members (org_id);

-- Helper function used by ALL subsequent RLS policies
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid AS $$
  SELECT org_id FROM public.organization_members
  WHERE user_id = auth.uid() AND active = true
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Members can see other members in their org
CREATE POLICY "members_can_read_own_org_members"
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (org_id = public.get_user_org_id());

-- Authenticated users can insert themselves as admin (onboarding)
CREATE POLICY "users_can_create_own_membership"
  ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can add/update/remove members
CREATE POLICY "admins_can_update_members"
  ON public.organization_members
  FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND active = true
    )
  );

CREATE POLICY "admins_can_delete_members"
  ON public.organization_members
  FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND active = true
    )
  );

CREATE POLICY "admins_can_insert_members"
  ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND active = true
    )
  );
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
  species text CHECK (species IN ('canino', 'felino', 'exotico')),
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
-- ============================================
-- Migration 6: Invoices, Invoice Items, Payments
-- ============================================

CREATE TABLE public.invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal numeric(10,2) DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0,
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_invoices_org_id ON public.invoices (org_id);
CREATE INDEX idx_invoices_client_id ON public.invoices (client_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.invoices
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

-- ---

CREATE TABLE public.invoice_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(8,2) DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  total numeric(10,2) NOT NULL,
  item_type text CHECK (item_type IN ('service', 'product')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items (invoice_id);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Access controlled through parent invoice
CREATE POLICY "org_isolation_via_invoice" ON public.invoice_items
  FOR ALL TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices WHERE org_id = public.get_user_org_id()
    )
  )
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM public.invoices WHERE org_id = public.get_user_org_id()
    )
  );

-- ---

CREATE TABLE public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  method text CHECK (method IN ('cash', 'card', 'transfer', 'other')),
  reference text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_payments_org_id ON public.payments (org_id);
CREATE INDEX idx_payments_invoice_id ON public.payments (invoice_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.payments
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());
-- ============================================
-- Migration 7: Products, Stock, Stock Movements, Suppliers
-- ============================================

CREATE TABLE public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  category text CHECK (category IN ('medicine', 'supply', 'food', 'accessory', 'other')),
  description text,
  unit text DEFAULT 'unit' CHECK (unit IN ('unit', 'ml', 'mg', 'box', 'kg', 'g')),
  purchase_price numeric(10,2),
  sale_price numeric(10,2),
  min_stock int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_products_org_id ON public.products (org_id);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.products
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

-- ---

CREATE TABLE public.stock (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  quantity numeric(10,2) DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_stock_product_org ON public.stock (product_id, org_id);

ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.stock
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

-- ---

CREATE TABLE public.stock_movements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity numeric(10,2) NOT NULL,
  reason text CHECK (reason IN ('purchase', 'sale', 'usage', 'loss', 'return', 'adjustment')),
  reference_id uuid,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_stock_movements_org_id ON public.stock_movements (org_id);
CREATE INDEX idx_stock_movements_product_id ON public.stock_movements (product_id);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.stock_movements
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

-- ---

CREATE TABLE public.suppliers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  notes text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_suppliers_org_id ON public.suppliers (org_id);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.suppliers
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());
