-- ============================================
-- Sprint 5 · Bloque 2 — Pricing peluquería configurable
-- ============================================
-- Permite que un servicio (típicamente de grooming) tenga múltiples precios
-- segmentados por especie, talla y/o rango de peso de la mascota.
--
-- Diseño:
--   * service_price_tiers contiene N tiers por servicio. Cada tier puede
--     filtrar por cualquier combinación de species + size + weight range.
--     Cuanto más específico el match con el pet, más prioritario en la
--     resolución (ver helper resolvePriceForPet en TS).
--   * pets.size se agrega como NULL opcional con CHECK enum.
--   * pets.weight ya existe como numeric(5,2). No la tocamos.
-- ============================================

BEGIN;

-- 1) Talla y peso en pets (opcional). Útil para tarifas de grooming.
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS size text NULL
  CHECK (size IS NULL OR size IN ('xs', 's', 'm', 'l', 'xl')),
  ADD COLUMN IF NOT EXISTS weight numeric(5,2) NULL;

-- 2) Tabla de tiers de precio por servicio.
CREATE TABLE IF NOT EXISTS public.service_price_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  label text NOT NULL,
  species_filter text NULL
    CHECK (species_filter IS NULL OR species_filter IN ('canino', 'felino', 'exotico')),
  size text NULL
    CHECK (size IS NULL OR size IN ('xs', 's', 'm', 'l', 'xl')),
  weight_min_kg numeric(6,2) NULL,
  weight_max_kg numeric(6,2) NULL,
  price numeric(10,2) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT service_price_tiers_weight_order
    CHECK (
      weight_min_kg IS NULL
      OR weight_max_kg IS NULL
      OR weight_min_kg <= weight_max_kg
    )
);

CREATE INDEX IF NOT EXISTS idx_service_price_tiers_service
  ON public.service_price_tiers (service_id)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_service_price_tiers_org
  ON public.service_price_tiers (org_id);

-- 3) RLS: aislamiento por organización (mismo patrón que services).
ALTER TABLE public.service_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.service_price_tiers
  FOR ALL TO authenticated
  USING (org_id = public.get_user_org_id())
  WITH CHECK (org_id = public.get_user_org_id());

COMMENT ON TABLE public.service_price_tiers IS
  'Tarifas variables de un servicio segmentadas por especie/talla/peso del paciente.';

COMMIT;
