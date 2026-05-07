-- ============================================
-- Superadmin Reform Ola 1 — Resumen + Tutor Hub + clinics_overview extendido
-- ============================================
-- Objetivo: la nueva home /superadmin necesita métricas globales (totales,
-- distribución de suscripciones, MRR, alertas) que hoy se obtenían en
-- el cliente sumando filas. Reemplazamos ese trabajo con dos RPCs nuevos
-- y extendemos `superadmin_clinics_overview` con campos que faltaban
-- (tutors_count, subscription_status, trial_ends_at, is_founder).
--
-- Lo que hace esta migración:
--   1. Agrega `organizations.is_founder boolean DEFAULT false` (Pablo lo
--      marcará a mano por UI futura). Sin UPDATE masivo: la migración
--      no asume quién es fundadora.
--   2. Reemplaza `superadmin_clinics_overview()` con la versión extendida.
--      La firma del return AGREGA columnas nuevas al final, manteniendo
--      el orden y nombre de las columnas existentes. La page.tsx actual,
--      que sólo consume las antiguas, sigue funcionando sin tocar nada.
--      Excluye orgs `is_personal=true` (no son clínicas).
--   3. Crea `superadmin_overview()` → JSON con totales/subs/MRR/alertas.
--   4. Crea `superadmin_tutor_hub_overview()` → tabla con orgs personales.
--
-- Seguridad: cada RPC hace SECURITY DEFINER + check `is_platform_admin()`.
-- Sin platform admin → excepción 'forbidden' (errcode 42501).

-- ===========================================================================
-- 1) Columna `is_founder` en organizations
-- ===========================================================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_founder boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.organizations.is_founder IS
  'true si la org pertenece al programa de 5 fundadoras ($80k CLP/mes vitalicio). Marcado manualmente por superadmin.';

CREATE INDEX IF NOT EXISTS idx_organizations_is_founder
  ON public.organizations (is_founder)
  WHERE is_founder = true;

-- ===========================================================================
-- 2) superadmin_clinics_overview() — versión extendida
-- ===========================================================================
-- Drop primero porque cambia la firma (return table) — no se puede hacer
-- CREATE OR REPLACE cuando se agregan columnas al return.
DROP FUNCTION IF EXISTS public.superadmin_clinics_overview();

CREATE OR REPLACE FUNCTION public.superadmin_clinics_overview()
RETURNS TABLE (
  org_id              uuid,
  org_name            text,
  org_slug            text,
  org_plan            text,
  org_created_at      timestamptz,
  total_members       bigint,
  active_members_7d   bigint,
  last_sign_in_at     timestamptz,
  consultations_7d    bigint,
  pets_count          bigint,
  alert_level         text,
  -- Nuevas columnas Ola 1:
  tutors_count        bigint,
  subscription_status text,
  trial_ends_at       timestamptz,
  is_founder          boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden: caller is not a platform admin'
      USING errcode = '42501';
  END IF;

  RETURN QUERY
  WITH
    members AS (
      SELECT
        om.org_id,
        om.user_id,
        u.last_sign_in_at
      FROM public.organization_members om
      LEFT JOIN auth.users u ON u.id = om.user_id
      WHERE om.active = true
    ),
    member_stats AS (
      SELECT
        m.org_id,
        count(*)::bigint                                              AS total_members,
        count(*) FILTER (
          WHERE m.last_sign_in_at IS NOT NULL
            AND m.last_sign_in_at >= now() - interval '7 days'
        )::bigint                                                     AS active_members_7d,
        max(m.last_sign_in_at)                                        AS last_sign_in_at
      FROM members m
      GROUP BY m.org_id
    ),
    consultation_stats AS (
      SELECT
        cr.org_id,
        count(*)::bigint AS consultations_7d
      FROM public.clinical_records cr
      WHERE cr.created_at >= now() - interval '7 days'
      GROUP BY cr.org_id
    ),
    pet_stats AS (
      SELECT
        p.org_id,
        count(*)::bigint AS pets_count
      FROM public.pets p
      GROUP BY p.org_id
    ),
    tutor_stats AS (
      SELECT
        c.org_id,
        count(*)::bigint AS tutors_count
      FROM public.clients c
      GROUP BY c.org_id
    )
  SELECT
    o.id                                                 AS org_id,
    o.name                                               AS org_name,
    o.slug                                               AS org_slug,
    coalesce(o.plan, 'free')                             AS org_plan,
    o.created_at                                         AS org_created_at,
    coalesce(ms.total_members, 0)                        AS total_members,
    coalesce(ms.active_members_7d, 0)                    AS active_members_7d,
    ms.last_sign_in_at                                   AS last_sign_in_at,
    coalesce(cs.consultations_7d, 0)                     AS consultations_7d,
    coalesce(ps.pets_count, 0)                           AS pets_count,
    CASE
      WHEN ms.last_sign_in_at IS NULL
        OR ms.last_sign_in_at < now() - interval '7 days'
        THEN 'zombie'
      WHEN coalesce(ms.total_members, 0) > 0
        AND (coalesce(ms.active_members_7d, 0)::numeric
             / nullif(ms.total_members, 0)::numeric) < 0.5
        THEN 'team_inactive'
      ELSE 'ok'
    END                                                  AS alert_level,
    coalesce(ts.tutors_count, 0)                         AS tutors_count,
    coalesce(o.subscription_status, 'trial')             AS subscription_status,
    o.trial_ends_at                                      AS trial_ends_at,
    coalesce(o.is_founder, false)                        AS is_founder
  FROM public.organizations o
  LEFT JOIN member_stats       ms ON ms.org_id = o.id
  LEFT JOIN consultation_stats cs ON cs.org_id = o.id
  LEFT JOIN pet_stats          ps ON ps.org_id = o.id
  LEFT JOIN tutor_stats        ts ON ts.org_id = o.id
  WHERE coalesce(o.is_personal, false) = false
  ORDER BY
    CASE
      WHEN ms.last_sign_in_at IS NULL OR ms.last_sign_in_at < now() - interval '7 days' THEN 0
      WHEN coalesce(ms.total_members, 0) > 0
        AND (coalesce(ms.active_members_7d, 0)::numeric
             / nullif(ms.total_members, 0)::numeric) < 0.5 THEN 1
      ELSE 2
    END ASC,
    ms.last_sign_in_at ASC NULLS FIRST;
END;
$$;

COMMENT ON FUNCTION public.superadmin_clinics_overview() IS
  'Panel superadmin Ola 1: una fila por clínica (excluye is_personal). Devuelve métricas + tutors_count + subscription_status + trial_ends_at + is_founder.';

REVOKE ALL ON FUNCTION public.superadmin_clinics_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.superadmin_clinics_overview() TO authenticated;

-- ===========================================================================
-- 3) superadmin_overview() — JSON consolidado para la home Resumen
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.superadmin_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_active_clinics int;
  v_personal_orgs int;
  v_total_tutors int;
  v_total_pets int;

  v_sub_trial int;
  v_sub_active int;
  v_sub_past_due int;
  v_sub_expired int;
  v_sub_cancelled int;

  v_trials_expiring_7d int;

  v_founders_closed int;

  v_mrr_clp bigint;

  v_zombies_14d int;
  v_team_inactive int;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden: caller is not a platform admin'
      USING errcode = '42501';
  END IF;

  -- ---------- Totales ----------
  SELECT
    count(*) FILTER (WHERE coalesce(is_personal, false) = false AND coalesce(active, true) = true)::int,
    count(*) FILTER (WHERE coalesce(is_personal, false) = true)::int
  INTO v_active_clinics, v_personal_orgs
  FROM public.organizations;

  SELECT count(*)::int INTO v_total_tutors
  FROM public.clients c
  JOIN public.organizations o ON o.id = c.org_id
  WHERE coalesce(o.is_personal, false) = false;

  SELECT count(*)::int INTO v_total_pets
  FROM public.pets p
  JOIN public.organizations o ON o.id = p.org_id
  WHERE coalesce(o.is_personal, false) = false;

  -- ---------- Distribución de suscripciones (solo clínicas reales) ----------
  SELECT
    count(*) FILTER (WHERE coalesce(subscription_status, 'trial') = 'trial')::int,
    count(*) FILTER (WHERE subscription_status = 'active')::int,
    count(*) FILTER (WHERE subscription_status = 'past_due')::int,
    count(*) FILTER (WHERE subscription_status = 'expired')::int,
    count(*) FILTER (WHERE subscription_status = 'cancelled')::int
  INTO v_sub_trial, v_sub_active, v_sub_past_due, v_sub_expired, v_sub_cancelled
  FROM public.organizations
  WHERE coalesce(is_personal, false) = false;

  -- ---------- Trials por vencer en 7 días ----------
  SELECT count(*)::int INTO v_trials_expiring_7d
  FROM public.organizations
  WHERE coalesce(is_personal, false) = false
    AND coalesce(subscription_status, 'trial') = 'trial'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at >= now()
    AND trial_ends_at <= now() + interval '7 days';

  -- ---------- Fundadoras cerradas ----------
  SELECT count(*)::int INTO v_founders_closed
  FROM public.organizations
  WHERE coalesce(is_personal, false) = false
    AND is_founder = true;

  -- ---------- MRR CLP ----------
  -- Reglas:
  --   * Solo orgs con subscription_status = 'active'.
  --   * Si is_founder = true → 80.000 CLP (deal vitalicio).
  --   * Si no, mapeo por plan: basico=29.000, pro=79.000, enterprise=149.000.
  --   * Cualquier otro plan o NULL → 0.
  SELECT coalesce(sum(
    CASE
      WHEN is_founder = true THEN 80000
      WHEN plan = 'basico' THEN 29000
      WHEN plan = 'pro' THEN 79000
      WHEN plan = 'enterprise' THEN 149000
      ELSE 0
    END
  ), 0)::bigint INTO v_mrr_clp
  FROM public.organizations
  WHERE coalesce(is_personal, false) = false
    AND subscription_status = 'active';

  -- ---------- Alertas ----------
  -- zombies_14d: orgs (no personal) sin ningún login de miembro en >=14 días
  WITH last_login AS (
    SELECT
      om.org_id,
      max(u.last_sign_in_at) AS max_login
    FROM public.organization_members om
    LEFT JOIN auth.users u ON u.id = om.user_id
    WHERE om.active = true
    GROUP BY om.org_id
  )
  SELECT count(*)::int INTO v_zombies_14d
  FROM public.organizations o
  LEFT JOIN last_login ll ON ll.org_id = o.id
  WHERE coalesce(o.is_personal, false) = false
    AND coalesce(o.active, true) = true
    AND (ll.max_login IS NULL OR ll.max_login < now() - interval '14 days');

  -- team_inactive: orgs con miembros, donde <50% logueó en 7 días
  WITH stats AS (
    SELECT
      om.org_id,
      count(*) AS total_members,
      count(*) FILTER (
        WHERE u.last_sign_in_at IS NOT NULL
          AND u.last_sign_in_at >= now() - interval '7 days'
      ) AS active_7d
    FROM public.organization_members om
    LEFT JOIN auth.users u ON u.id = om.user_id
    WHERE om.active = true
    GROUP BY om.org_id
  )
  SELECT count(*)::int INTO v_team_inactive
  FROM stats s
  JOIN public.organizations o ON o.id = s.org_id
  WHERE coalesce(o.is_personal, false) = false
    AND coalesce(o.active, true) = true
    AND s.total_members > 0
    AND (s.active_7d::numeric / s.total_members::numeric) < 0.5;

  -- ---------- Construir JSON de salida ----------
  RETURN jsonb_build_object(
    'totals', jsonb_build_object(
      'active_clinics', v_active_clinics,
      'personal_orgs',  v_personal_orgs,
      'total_tutors',   v_total_tutors,
      'total_pets',     v_total_pets
    ),
    'subscriptions', jsonb_build_object(
      'trial',     v_sub_trial,
      'active',    v_sub_active,
      'past_due',  v_sub_past_due,
      'expired',   v_sub_expired,
      'cancelled', v_sub_cancelled
    ),
    'trials_expiring_7d', v_trials_expiring_7d,
    'founders', jsonb_build_object(
      'closed', v_founders_closed,
      'target', 5
    ),
    'mrr_clp', v_mrr_clp,
    'alerts', jsonb_build_object(
      'zombies_14d',   v_zombies_14d,
      'team_inactive', v_team_inactive
    )
  );
END;
$$;

COMMENT ON FUNCTION public.superadmin_overview() IS
  'Panel superadmin Ola 1: JSON con totales, distribución de suscripciones, MRR CLP, fundadoras y alertas. Excluye orgs personales. Requiere is_platform_admin().';

REVOKE ALL ON FUNCTION public.superadmin_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.superadmin_overview() TO authenticated;

-- ===========================================================================
-- 4) superadmin_tutor_hub_overview() — orgs personales (Hub del Tutor)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.superadmin_tutor_hub_overview()
RETURNS TABLE (
  org_id           uuid,
  tutor_name       text,
  tutor_email      text,
  created_at       timestamptz,
  last_sign_in_at  timestamptz,
  pets_count       bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden: caller is not a platform admin'
      USING errcode = '42501';
  END IF;

  RETURN QUERY
  WITH
    -- Para cada org personal, tomamos el miembro admin más antiguo como
    -- "tutor de referencia" (en la práctica suele ser el único miembro).
    primary_member AS (
      SELECT DISTINCT ON (om.org_id)
        om.org_id,
        om.user_id,
        om.first_name,
        om.last_name
      FROM public.organization_members om
      WHERE om.active = true
        AND om.role = 'admin'
      ORDER BY om.org_id, om.created_at ASC NULLS LAST
    ),
    pet_counts AS (
      SELECT p.org_id, count(*)::bigint AS pets_count
      FROM public.pets p
      GROUP BY p.org_id
    )
  SELECT
    o.id AS org_id,
    nullif(trim(coalesce(pm.first_name, '') || ' ' || coalesce(pm.last_name, '')), '') AS tutor_name,
    u.email::text AS tutor_email,
    o.created_at,
    u.last_sign_in_at,
    coalesce(pc.pets_count, 0) AS pets_count
  FROM public.organizations o
  LEFT JOIN primary_member pm ON pm.org_id = o.id
  LEFT JOIN auth.users u ON u.id = pm.user_id
  LEFT JOIN pet_counts pc ON pc.org_id = o.id
  WHERE coalesce(o.is_personal, false) = true
  ORDER BY o.created_at DESC
  LIMIT 200;
END;
$$;

COMMENT ON FUNCTION public.superadmin_tutor_hub_overview() IS
  'Panel superadmin Ola 1: lista de orgs personales (tutores sin clínica) ordenadas por created_at desc, top 200. Requiere is_platform_admin().';

REVOKE ALL ON FUNCTION public.superadmin_tutor_hub_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.superadmin_tutor_hub_overview() TO authenticated;
