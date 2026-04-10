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
