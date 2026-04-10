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
