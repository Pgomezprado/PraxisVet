-- ============================================
-- Superadmin — RPC superadmin_org_pulse
-- ============================================
-- Vista de "pulso del piloto": detecta features no activadas (blind spots)
-- y retorna timeline de actividad diaria de los últimos 14 días.
-- Objetivo: entrar a la reunión con la clínica fundadora (Paws & Hair)
-- con datos duros sobre qué están usando y qué no.
--
-- Seguridad: SECURITY DEFINER con check is_platform_admin() en la primera línea.

create or replace function public.superadmin_org_pulse(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_blind_spots   jsonb;
  v_daily         jsonb;
  v_totals        jsonb;
  v_trial         jsonb;

  -- contadores para blind spots
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

  -- identidad
  v_plan            text;
  v_trial_ends      timestamptz;
  v_sub_status      text;
  v_founder_since   text;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden: caller is not a platform admin'
      using errcode = '42501';
  end if;

  -- Validar que la org exista
  perform 1 from public.organizations where id = p_org_id;
  if not found then
    raise exception 'org_not_found' using errcode = 'P0002';
  end if;

  -- ---------- Trial / plan snapshot ----------
  select
    coalesce(plan, 'free'),
    trial_ends_at,
    subscription_status,
    nullif(settings->>'founder_since', '')
  into v_plan, v_trial_ends, v_sub_status, v_founder_since
  from public.organizations
  where id = p_org_id;

  v_trial := jsonb_build_object(
    'plan', v_plan,
    'subscription_status', v_sub_status,
    'trial_ends_at', v_trial_ends,
    'days_to_trial_end',
      case when v_trial_ends is null then null
           else greatest(0, ceil(extract(epoch from (v_trial_ends - now())) / 86400))::int
      end,
    'founder_since', v_founder_since
  );

  -- ---------- Blind spots ----------
  select count(*)::int into c_services_total
    from public.services where org_id = p_org_id and active = true;
  select count(*)::int into c_services_no_price
    from public.services where org_id = p_org_id and active = true and (price is null or price = 0);

  select count(*)::int into c_products_total
    from public.products where org_id = p_org_id and active = true;
  select count(*)::int into c_products_no_sale
    from public.products where org_id = p_org_id and active = true and (sale_price is null or sale_price = 0);

  select count(*)::int into c_clients_total
    from public.clients where org_id = p_org_id;
  select count(*)::int into c_clients_no_rut
    from public.clients where org_id = p_org_id and (rut is null or btrim(rut) = '');

  select count(*)::int into c_invoices_7d
    from public.invoices where org_id = p_org_id
      and status <> 'cancelled'
      and created_at >= now() - interval '7 days';
  select count(*)::int into c_invoices_30d
    from public.invoices where org_id = p_org_id
      and status <> 'cancelled'
      and created_at >= now() - interval '30 days';

  select
    count(*) filter (where u.last_sign_in_at is null)::int,
    count(*)::int
  into c_members_never_login, c_members_total
  from public.organization_members om
  left join auth.users u on u.id = om.user_id
  where om.org_id = p_org_id and om.active = true;

  v_blind_spots := jsonb_build_array(
    -- Catálogo de servicios
    jsonb_build_object(
      'key', 'services',
      'label', 'Catálogo de servicios',
      'ok', c_services_total > 0 and c_services_no_price = 0,
      'severity',
        case
          when c_services_total = 0 then 'critical'
          when c_services_no_price > 0 then 'warning'
          else 'ok'
        end,
      'detail',
        case
          when c_services_total = 0 then 'No hay servicios cargados'
          when c_services_no_price > 0 then c_services_no_price || ' de ' || c_services_total || ' sin precio'
          else c_services_total || ' servicios con precio configurado'
        end
    ),
    -- Inventario
    jsonb_build_object(
      'key', 'inventory',
      'label', 'Inventario de productos',
      'ok', c_products_total > 0,
      'severity',
        case
          when c_products_total = 0 then 'warning'
          when c_products_no_sale > 0 then 'info'
          else 'ok'
        end,
      'detail',
        case
          when c_products_total = 0 then 'No hay productos cargados'
          when c_products_no_sale > 0 then c_products_no_sale || ' de ' || c_products_total || ' sin precio de venta'
          else c_products_total || ' productos configurados'
        end
    ),
    -- Facturación activa
    jsonb_build_object(
      'key', 'billing',
      'label', 'Facturación emitida',
      'ok', c_invoices_7d > 0,
      'severity',
        case
          when c_invoices_30d = 0 then 'critical'
          when c_invoices_7d = 0 then 'warning'
          else 'ok'
        end,
      'detail',
        case
          when c_invoices_30d = 0 then 'Sin boletas ni facturas en 30 días'
          when c_invoices_7d = 0 then 'Sin emisión últimos 7d (' || c_invoices_30d || ' en 30d)'
          else c_invoices_7d || ' documentos emitidos últimos 7d'
        end
    ),
    -- RUT en clientes (requisito SII para factura)
    jsonb_build_object(
      'key', 'clients_rut',
      'label', 'RUT de clientes',
      'ok', c_clients_total > 0 and c_clients_no_rut = 0,
      'severity',
        case
          when c_clients_total = 0 then 'info'
          when c_clients_no_rut::numeric / nullif(c_clients_total, 0) > 0.5 then 'warning'
          when c_clients_no_rut > 0 then 'info'
          else 'ok'
        end,
      'detail',
        case
          when c_clients_total = 0 then 'Sin clientes cargados'
          when c_clients_no_rut = 0 then 'Todos con RUT (' || c_clients_total || ')'
          else c_clients_no_rut || ' de ' || c_clients_total || ' sin RUT'
        end
    ),
    -- Activación del equipo
    jsonb_build_object(
      'key', 'team_activation',
      'label', 'Activación del equipo',
      'ok', c_members_never_login = 0 and c_members_total > 0,
      'severity',
        case
          when c_members_total = 0 then 'critical'
          when c_members_never_login > 0 then 'warning'
          else 'ok'
        end,
      'detail',
        case
          when c_members_total = 0 then 'Sin miembros activos'
          when c_members_never_login > 0 then c_members_never_login || ' de ' || c_members_total || ' nunca entraron'
          else 'Todos los miembros han entrado (' || c_members_total || ')'
        end
    )
  );

  -- ---------- Daily activity últimos 14 días ----------
  with days as (
    select generate_series(
      (now() at time zone 'America/Santiago')::date - 13,
      (now() at time zone 'America/Santiago')::date,
      interval '1 day'
    )::date as day
  ),
  appts_per_day as (
    select
      date as day,
      count(*) filter (where status = 'completed' and type = 'medical')::int as consults,
      count(*) filter (where status = 'completed' and type = 'grooming')::int as grooming,
      count(*)::int as total
    from public.appointments
    where org_id = p_org_id
      and date >= (now() at time zone 'America/Santiago')::date - 13
    group by date
  ),
  invoices_per_day as (
    select
      (created_at at time zone 'America/Santiago')::date as day,
      count(*)::int as invoices
    from public.invoices
    where org_id = p_org_id
      and status <> 'cancelled'
      and created_at >= (now() at time zone 'America/Santiago')::date - 13
    group by (created_at at time zone 'America/Santiago')::date
  ),
  clients_per_day as (
    select
      (created_at at time zone 'America/Santiago')::date as day,
      count(*)::int as new_clients
    from public.clients
    where org_id = p_org_id
      and created_at >= (now() at time zone 'America/Santiago')::date - 13
    group by (created_at at time zone 'America/Santiago')::date
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'day', to_char(d.day, 'YYYY-MM-DD'),
      'appointments', coalesce(a.total, 0),
      'consultations', coalesce(a.consults, 0),
      'grooming', coalesce(a.grooming, 0),
      'invoices', coalesce(i.invoices, 0),
      'new_clients', coalesce(c.new_clients, 0)
    )
    order by d.day
  ), '[]'::jsonb)
  into v_daily
  from days d
  left join appts_per_day a    on a.day = d.day
  left join invoices_per_day i on i.day = d.day
  left join clients_per_day c  on c.day = d.day;

  -- ---------- Totales (14 días) ----------
  v_totals := jsonb_build_object(
    'clients_total', c_clients_total,
    'invoices_7d', c_invoices_7d,
    'invoices_30d', c_invoices_30d
  );

  return jsonb_build_object(
    'trial', v_trial,
    'blind_spots', v_blind_spots,
    'daily_activity', v_daily,
    'totals', v_totals
  );
end;
$$;

comment on function public.superadmin_org_pulse(uuid) is
  'Panel superadmin: pulso del piloto. Devuelve blind spots (features no activadas) y actividad diaria 14d. Requiere is_platform_admin()=true.';

revoke all on function public.superadmin_org_pulse(uuid) from public;
grant execute on function public.superadmin_org_pulse(uuid) to authenticated;
