-- Fix: admins_can_update_members policy lacked WITH CHECK, allowing an admin
-- to move a member to another org. Add WITH CHECK and a trigger that forbids
-- changing org_id / user_id on UPDATE.

DROP POLICY IF EXISTS "admins_can_update_members" ON public.organization_members;

CREATE POLICY "admins_can_update_members"
  ON public.organization_members
  FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND active = true
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'admin' AND active = true
    )
  );

CREATE OR REPLACE FUNCTION public.prevent_org_member_key_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
    RAISE EXCEPTION 'org_id no puede modificarse en organization_members';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id no puede modificarse en organization_members';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_org_member_key_change ON public.organization_members;

CREATE TRIGGER trg_prevent_org_member_key_change
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_org_member_key_change();
