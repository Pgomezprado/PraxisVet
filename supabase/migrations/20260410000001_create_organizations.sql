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

-- Allow anyone to check slug availability (for onboarding)
CREATE POLICY "anyone_can_check_slug"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (true);

-- NOTE: Cross-table policies that reference organization_members
-- (members_can_read_own_org, admins_can_update_own_org) live in
-- migration 2, after organization_members is created.
