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
-- Cross-table policies on public.organizations
-- (moved here because they reference organization_members)
-- ============================================

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
