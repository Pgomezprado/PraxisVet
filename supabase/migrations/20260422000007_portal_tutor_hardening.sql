-- ============================================
-- Sprint 5 · Bloque 1 — Portal del tutor (hardening)
-- ============================================
-- Cambios:
--   1) Columnas en client_auth_links: expires_at, last_accessed_at.
--   2) Tabla client_auth_audit con eventos críticos del ciclo de vida del
--      acceso del tutor (request, consume, granted, revoked, bootstrap_failed).
--   3) Funciones is_tutor_of_* endurecidas: chequean revoked_at IS NULL y
--      (expires_at IS NULL OR expires_at > now()).
--   4) RLS de la tabla audit: solo lectura para staff de la org;
--      escritura sólo via service_role (no policy INSERT para authenticated).
-- ============================================

BEGIN;

-- 1) Nuevas columnas en client_auth_links.
ALTER TABLE public.client_auth_links
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_client_auth_links_expires_at
  ON public.client_auth_links (expires_at)
  WHERE expires_at IS NOT NULL;

-- 2) Tabla de auditoría.
CREATE TABLE IF NOT EXISTS public.client_auth_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_auth_link_id uuid REFERENCES public.client_auth_links(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event text NOT NULL CHECK (event IN (
    'link_requested',
    'link_consumed',
    'access_granted',
    'access_revoked',
    'access_renewed',
    'expiration_set',
    'bootstrap_failed'
  )),
  ip text,
  user_agent text,
  metadata jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_auth_audit_link
  ON public.client_auth_audit (client_auth_link_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_auth_audit_org_event
  ON public.client_auth_audit (org_id, event, occurred_at DESC);

ALTER TABLE public.client_auth_audit ENABLE ROW LEVEL SECURITY;

-- Lectura para admin/recepcionista de la org. NO hay policy INSERT/UPDATE/DELETE
-- para authenticated → solo el service_role escribe (vía /lib/audit/portal-audit.ts).
CREATE POLICY "client_auth_audit_staff_read" ON public.client_auth_audit
  FOR SELECT TO authenticated
  USING (
    public.user_has_role_in_org(org_id, ARRAY['admin', 'receptionist']::text[])
  );

-- 3) Funciones is_tutor_of_* endurecidas.
CREATE OR REPLACE FUNCTION public.is_tutor_of_client(check_client_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_auth_links
    WHERE client_id = check_client_id
      AND user_id = auth.uid()
      AND active = true
      AND linked_at IS NOT NULL
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tutor_of_pet(check_pet_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pets p
    JOIN public.client_auth_links cal ON cal.client_id = p.client_id
    WHERE p.id = check_pet_id
      AND cal.user_id = auth.uid()
      AND cal.active = true
      AND cal.linked_at IS NOT NULL
      AND cal.revoked_at IS NULL
      AND (cal.expires_at IS NULL OR cal.expires_at > now())
  );
$$;

COMMENT ON FUNCTION public.is_tutor_of_client(uuid) IS
  'Tutor con vínculo activo, confirmado, no revocado y dentro de expiración.';

COMMENT ON FUNCTION public.is_tutor_of_pet(uuid) IS
  'Tutor de la mascota. Mismas condiciones que is_tutor_of_client.';

COMMIT;
