-- ============================================
-- Trial gateway: 2-month trial period tracking
-- ============================================
-- Adds subscription + trial tracking columns to organizations.
-- Renames 'free' plan to 'basico' (public pricing: Básico $29k, Pro $79k, Enterprise $149k).
-- Backfills existing orgs so the layout gate does not lock anyone out accidentally.

-- 1) Drop old plan CHECK so we can change the values
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_plan_check;

-- 2) Rename 'free' to 'basico' in-flight (data only; default is updated below)
UPDATE public.organizations
SET plan = 'basico'
WHERE plan = 'free';

-- 3) New CHECK with updated plan set + new default
ALTER TABLE public.organizations
  ALTER COLUMN plan SET DEFAULT 'basico';

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_plan_check
  CHECK (plan IN ('basico', 'pro', 'enterprise'));

-- 4) Add trial + subscription tracking columns
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at    timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trial';

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_subscription_status_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_subscription_status_check
  CHECK (subscription_status IN ('trial', 'active', 'past_due', 'expired', 'cancelled'));

-- 5) Partial index for the daily cron (only scans trials still open)
CREATE INDEX IF NOT EXISTS organizations_trial_ends_idx
  ON public.organizations (trial_ends_at)
  WHERE subscription_status = 'trial';

-- 6) Backfill existing orgs so no one gets locked out unexpectedly.
-- Orgs created <60 days ago keep a legit trial window.
-- Orgs created earlier are grandfathered as 'active' (Pablo can change them manually).
UPDATE public.organizations
SET trial_started_at = created_at,
    trial_ends_at    = created_at + interval '60 days',
    subscription_status = CASE
      WHEN created_at + interval '60 days' > now() THEN 'trial'
      ELSE 'active'
    END
WHERE trial_ends_at IS NULL;
