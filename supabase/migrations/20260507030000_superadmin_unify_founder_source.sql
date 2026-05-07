-- ============================================
-- Hotfix superadmin: unificar fuente de "fundadora"
-- ============================================
-- Antes había dos lugares con el concepto "fundadora":
--   1. organizations.settings->>'founder_since' (texto, pre-existente)
--   2. organizations.is_founder (boolean, añadido en Ola 1)
--
-- El detalle de clínica leía (1), la tabla y el contador del Resumen leen (2),
-- y el toggle de la UI sólo modifica (2). Resultado: el detalle mostraba
-- "Fundadora" para Paws & Hair pero la tabla y el contador no.
--
-- Esta migración:
--   A) Backfill: orgs con settings->>'founder_since' no nulo → is_founder=true.
--   B) Reemplaza superadmin_org_pulse para leer is_founder de la columna real
--      y exponer el booleano en el JSON `trial.is_founder`. Mantiene
--      founder_since como string derivado (compat) — toma el del settings si
--      existe, si no usa created_at de la org.
--
-- Seguridad: SECURITY DEFINER + check is_platform_admin().

-- ===========================================================================
-- A) Backfill
-- ===========================================================================
UPDATE public.organizations
SET is_founder = true
WHERE coalesce(is_personal, false) = false
  AND nullif(settings->>'founder_since', '') IS NOT NULL
  AND coalesce(is_founder, false) = false;

-- ===========================================================================
-- B) Reemplazo de superadmin_org_pulse
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.superadmin_org_pulse(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_blind_spots   jsonb;
  v_daily         jsonb;
  v_totals        jsonb;
  v_trial         jsonb;

  c_services_total       int;
  c_services_no_price    int;
  c_products_total       int;
  c_products_no_sale     int;
  c_clients_total        int;
  c_clients_no_rut       int;
  c_invoices_7d          int;
  c_invoices_30d         int;
  c_members_never_login  int;
  c_members_total        int;

  v_plan            text;
  v_trial_ends      timestamptz;
  v_sub_status      text;
  v_is_founder      boolean;
  v_founder_since   text;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden: caller is not a platform admin'
      USING errcode = '42501';
  END IF;

  PERFORM 1 FROM public.organizations WHERE id = p_org_id;
  IF NOT found THEN
    RAISE EXCEPTION 'org_not_found' USING errcode = 'P0002';
  END IF;

  -- Trial / plan snapshot. is_founder ahora viene de la columna real.
  -- founder_since se deriva: si la columna settings tiene un valor lo usa,
  -- si no, cae al created_at de la org formateado YYYY-MM-DD (sólo cuando
  -- is_founder=true).
  SELECT
    coalesce(plan, 'basico'),
    trial_ends_at,
    subscription_status,
    coalesce(is_founder, false),
    CASE
      WHEN coalesce(is_founder, false) = true
        THEN coalesce(
               nullif(settings->>'founder_since', ''),
               to_char(created_at, 'YYYY-MM-DD')
             )
      ELSE NULL
    END
  INTO v_plan, v_trial_ends, v_sub_status, v_is_founder, v_founder_since
  FROM public.organizations
  WHERE id = p_org_id;

  v_trial := jsonb_build_object(
    'plan', v_plan,
    'subscription_status', v_sub_status,
    'trial_ends_at', v_trial_ends,
    'days_to_trial_end',
      CASE WHEN v_trial_ends IS NULL THEN NULL
           ELSE greatest(0, ceil(extract(epoch FROM (v_trial_ends - now())) / 86400))::int
      END,
    'is_founder', v_is_founder,
    'founder_since', v_founder_since
  );

  -- Blind spots
  SELECT count(*)::int INTO c_services_total
    FROM public.services WHERE org_id = p_org_id AND active = true;
  SELECT count(*)::int INTO c_services_no_price
    FROM public.services WHERE org_id = p_org_id AND active = true AND (price IS NULL OR price = 0);

  SELECT count(*)::int INTO c_products_total
    FROM public.products WHERE org_id = p_org_id AND active = true;
  SELECT count(*)::int INTO c_products_no_sale
    FROM public.products WHERE org_id = p_org_id AND active = true AND (sale_price IS NULL OR sale_price = 0);

  SELECT count(*)::int INTO c_clients_total
    FROM public.clients WHERE org_id = p_org_id;
  SELECT count(*)::int INTO c_clients_no_rut
    FROM public.clients WHERE org_id = p_org_id AND (rut IS NULL OR btrim(rut) = '');

  SELECT count(*)::int INTO c_invoices_7d
    FROM public.invoices WHERE org_id = p_org_id
      AND status <> 'cancelled'
      AND created_at >= now() - interval '7 days';
  SELECT count(*)::int INTO c_invoices_30d
    FROM public.invoices WHERE org_id = p_org_id
      AND status <> 'cancelled'
      AND created_at >= now() - interval '30 days';

  SELECT
    count(*) FILTER (WHERE u.last_sign_in_at IS NULL)::int,
    count(*)::int
  INTO c_members_never_login, c_members_total
  FROM public.organization_members om
  LEFT JOIN auth.users u ON u.id = om.user_id
  WHERE om.org_id = p_org_id AND om.active = true;

  v_blind_spots := jsonb_build_array(
    jsonb_build_object(
      'key', 'services',
      'label', 'Catálogo de servicios',
      'ok', c_services_total > 0 AND c_services_no_price = 0,
      'severity',
        CASE
          WHEN c_services_total = 0 THEN 'critical'
          WHEN c_services_no_price > 0 THEN 'warning'
          ELSE 'ok'
        END,
      'detail',
        CASE
          WHEN c_services_total = 0 THEN 'No hay servicios cargados'
          WHEN c_services_no_price > 0 THEN c_services_no_price || ' de ' || c_services_total || ' sin precio'
          ELSE c_services_total || ' servicios con precio configurado'
        END
    ),
    jsonb_build_object(
      'key', 'inventory',
      'label', 'Inventario de productos',
      'ok', c_products_total > 0,
      'severity',
        CASE
          WHEN c_products_total = 0 THEN 'warning'
          WHEN c_products_no_sale > 0 THEN 'info'
          ELSE 'ok'
        END,
      'detail',
        CASE
          WHEN c_products_total = 0 THEN 'No hay productos cargados'
          WHEN c_products_no_sale > 0 THEN c_products_no_sale || ' de ' || c_products_total || ' sin precio de venta'
          ELSE c_products_total || ' productos configurados'
        END
    ),
    jsonb_build_object(
      'key', 'billing',
      'label', 'Facturación emitida',
      'ok', c_invoices_7d > 0,
      'severity',
        CASE
          WHEN c_invoices_30d = 0 THEN 'critical'
          WHEN c_invoices_7d = 0 THEN 'warning'
          ELSE 'ok'
        END,
      'detail',
        CASE
          WHEN c_invoices_30d = 0 THEN 'Sin boletas ni facturas en 30 días'
          WHEN c_invoices_7d = 0 THEN 'Sin emisión últimos 7d (' || c_invoices_30d || ' en 30d)'
          ELSE c_invoices_7d || ' documentos emitidos últimos 7d'
        END
    ),
    jsonb_build_object(
      'key', 'clients_rut',
      'label', 'RUT de clientes',
      'ok', c_clients_total > 0 AND c_clients_no_rut = 0,
      'severity',
        CASE
          WHEN c_clients_total = 0 THEN 'info'
          WHEN c_clients_no_rut::numeric / nullif(c_clients_total, 0) > 0.5 THEN 'warning'
          WHEN c_clients_no_rut > 0 THEN 'info'
          ELSE 'ok'
        END,
      'detail',
        CASE
          WHEN c_clients_total = 0 THEN 'Sin clientes cargados'
          WHEN c_clients_no_rut = 0 THEN 'Todos con RUT (' || c_clients_total || ')'
          ELSE c_clients_no_rut || ' de ' || c_clients_total || ' sin RUT'
        END
    ),
    jsonb_build_object(
      'key', 'team_activation',
      'label', 'Activación del equipo',
      'ok', c_members_never_login = 0 AND c_members_total > 0,
      'severity',
        CASE
          WHEN c_members_total = 0 THEN 'critical'
          WHEN c_members_never_login > 0 THEN 'warning'
          ELSE 'ok'
        END,
      'detail',
        CASE
          WHEN c_members_total = 0 THEN 'Sin miembros activos'
          WHEN c_members_never_login > 0 THEN c_members_never_login || ' de ' || c_members_total || ' nunca entraron'
          ELSE 'Todos los miembros han entrado (' || c_members_total || ')'
        END
    )
  );

  WITH days AS (
    SELECT generate_series(
      (now() AT TIME ZONE 'America/Santiago')::date - 13,
      (now() AT TIME ZONE 'America/Santiago')::date,
      interval '1 day'
    )::date AS day
  ),
  appts_per_day AS (
    SELECT
      date AS day,
      count(*) FILTER (WHERE status = 'completed' AND type = 'medical')::int AS consults,
      count(*) FILTER (WHERE status = 'completed' AND type = 'grooming')::int AS grooming,
      count(*)::int AS total
    FROM public.appointments
    WHERE org_id = p_org_id
      AND date >= (now() AT TIME ZONE 'America/Santiago')::date - 13
    GROUP BY date
  ),
  invoices_per_day AS (
    SELECT
      (created_at AT TIME ZONE 'America/Santiago')::date AS day,
      count(*)::int AS invoices
    FROM public.invoices
    WHERE org_id = p_org_id
      AND status <> 'cancelled'
      AND created_at >= (now() AT TIME ZONE 'America/Santiago')::date - 13
    GROUP BY (created_at AT TIME ZONE 'America/Santiago')::date
  ),
  clients_per_day AS (
    SELECT
      (created_at AT TIME ZONE 'America/Santiago')::date AS day,
      count(*)::int AS new_clients
    FROM public.clients
    WHERE org_id = p_org_id
      AND created_at >= (now() AT TIME ZONE 'America/Santiago')::date - 13
    GROUP BY (created_at AT TIME ZONE 'America/Santiago')::date
  )
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'day', to_char(d.day, 'YYYY-MM-DD'),
      'appointments', coalesce(a.total, 0),
      'consultations', coalesce(a.consults, 0),
      'grooming', coalesce(a.grooming, 0),
      'invoices', coalesce(i.invoices, 0),
      'new_clients', coalesce(c.new_clients, 0)
    )
    ORDER BY d.day
  ), '[]'::jsonb)
  INTO v_daily
  FROM days d
  LEFT JOIN appts_per_day a    ON a.day = d.day
  LEFT JOIN invoices_per_day i ON i.day = d.day
  LEFT JOIN clients_per_day c  ON c.day = d.day;

  v_totals := jsonb_build_object(
    'clients_total', c_clients_total,
    'invoices_7d', c_invoices_7d,
    'invoices_30d', c_invoices_30d
  );

  RETURN jsonb_build_object(
    'trial', v_trial,
    'blind_spots', v_blind_spots,
    'daily_activity', v_daily,
    'totals', v_totals
  );
END;
$$;

REVOKE ALL ON FUNCTION public.superadmin_org_pulse(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.superadmin_org_pulse(uuid) TO authenticated;

COMMENT ON FUNCTION public.superadmin_org_pulse(uuid) IS
  'Panel superadmin: pulso del piloto. trial.is_founder ahora viene de organizations.is_founder (columna real, modificada por el toggle).';
