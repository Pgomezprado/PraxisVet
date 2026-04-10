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
