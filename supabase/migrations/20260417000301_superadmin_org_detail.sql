-- ============================================
-- Superadmin Fase 2 — RPC superadmin_org_detail
-- ============================================
-- Devuelve un JSON con toda la data necesaria para la vista de detalle
-- de una clínica en el panel superadmin. Una sola llamada, cuatro
-- bloques (identity, members, activity, adoption).
--
-- Seguridad: SECURITY DEFINER + check `is_platform_admin()` en la
-- primera línea. Sin platform admin → excepción 'forbidden'.

create or replace function public.superadmin_org_detail(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_identity     jsonb;
  v_members      jsonb;
  v_activity     jsonb;
  v_adoption     jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden: caller is not a platform admin'
      using errcode = '42501';
  end if;

  -- ---------- Identity ----------
  select to_jsonb(o) - 'settings' - 'logo_url' - 'active' - 'email'
         || jsonb_build_object('plan', coalesce(o.plan, 'free'))
  into v_identity
  from (
    select id, name, slug, plan, created_at, phone, address
    from public.organizations
    where id = p_org_id
  ) o;

  if v_identity is null then
    raise exception 'org_not_found' using errcode = 'P0002';
  end if;

  -- ---------- Members ----------
  -- Ordenamos admin → vet → receptionist → groomer, luego último login desc.
  with mm as (
    select
      om.user_id,
      om.first_name,
      om.last_name,
      om.role,
      u.email,
      u.created_at as invited_at,
      u.last_sign_in_at,
      case
        when u.last_sign_in_at is null then 'never'
        when u.last_sign_in_at >= now() - interval '7 days' then 'active'
        else 'inactive'
      end as status
    from public.organization_members om
    left join auth.users u on u.id = om.user_id
    where om.org_id = p_org_id
      and om.active = true
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', user_id,
      'first_name', first_name,
      'last_name', last_name,
      'email', email,
      'role', role,
      'invited_at', invited_at,
      'last_sign_in_at', last_sign_in_at,
      'status', status
    )
    order by
      case role
        when 'admin' then 0
        when 'vet' then 1
        when 'receptionist' then 2
        when 'groomer' then 3
        else 4
      end,
      last_sign_in_at desc nulls last
  ), '[]'::jsonb)
  into v_members
  from mm;

  -- ---------- Activity ----------
  -- Fuentes:
  --   consultations: appointments type='medical' status='completed'
  --   grooming:      appointments type='grooming' status='completed'
  --   appointments:  total creados
  --   new_pets:      pets.created_at
  --   prescriptions: prescriptions.created_at (+ % retenidas)
  with
    appt_stats as (
      select
        count(*) filter (where type='medical' and status='completed' and date >= (now() - interval '7 days')::date)::int  as cons_7d,
        count(*) filter (where type='medical' and status='completed' and date >= (now() - interval '30 days')::date)::int as cons_30d,
        count(*) filter (where type='grooming' and status='completed' and date >= (now() - interval '7 days')::date)::int  as groom_7d,
        count(*) filter (where type='grooming' and status='completed' and date >= (now() - interval '30 days')::date)::int as groom_30d,
        count(*) filter (where created_at >= now() - interval '7 days')::int  as appt_7d,
        count(*) filter (where created_at >= now() - interval '30 days')::int as appt_30d
      from public.appointments
      where org_id = p_org_id
    ),
    pet_stats as (
      select
        count(*) filter (where created_at >= now() - interval '7 days')::int  as new_7d,
        count(*) filter (where created_at >= now() - interval '30 days')::int as new_30d
      from public.pets
      where org_id = p_org_id
    ),
    rx_stats as (
      select
        count(*) filter (where created_at >= now() - interval '7 days')::int                        as rx_7d,
        count(*) filter (where created_at >= now() - interval '30 days')::int                       as rx_30d,
        count(*) filter (where created_at >= now() - interval '7 days' and is_retained)::int        as rx_ret_7d
      from public.prescriptions
      where org_id = p_org_id
    )
  select jsonb_build_object(
    'consultations_7d',  a.cons_7d,
    'consultations_30d', a.cons_30d,
    'grooming_7d',       a.groom_7d,
    'grooming_30d',      a.groom_30d,
    'appointments_7d',   a.appt_7d,
    'appointments_30d',  a.appt_30d,
    'new_pets_7d',       p.new_7d,
    'new_pets_30d',      p.new_30d,
    'prescriptions_7d',  r.rx_7d,
    'prescriptions_30d', r.rx_30d,
    'prescriptions_retained_pct_7d',
      case when r.rx_7d = 0 then 0
           else round(100.0 * r.rx_ret_7d / r.rx_7d)::int end
  )
  into v_activity
  from appt_stats a, pet_stats p, rx_stats r;

  -- ---------- Adoption por rol ----------
  -- active_members_7d por rol (con at least un login en 7d).
  -- Para cada rol, "primary action" distinto:
  --   admin:        # de miembros con último login <7d (proxy de "logins")
  --   vet:          # consultas (clinical_records) + # recetas
  --   receptionist: # citas creadas + # clients creados
  --   groomer:      # citas grooming completadas (últimos 7d)
  with
    members_by_role as (
      select
        om.role,
        count(*) filter (
          where u.last_sign_in_at is not null
            and u.last_sign_in_at >= now() - interval '7 days'
        )::int as active_7d
      from public.organization_members om
      left join auth.users u on u.id = om.user_id
      where om.org_id = p_org_id and om.active = true
      group by om.role
    ),
    vet_actions as (
      select
        (select count(*)::int from public.clinical_records
          where org_id = p_org_id and created_at >= now() - interval '7 days') as consults_7d,
        (select count(*)::int from public.prescriptions
          where org_id = p_org_id and created_at >= now() - interval '7 days') as rx_7d
    ),
    recep_actions as (
      select
        (select count(*)::int from public.appointments
          where org_id = p_org_id and created_at >= now() - interval '7 days') as appts_7d,
        (select count(*)::int from public.clients
          where org_id = p_org_id and created_at >= now() - interval '7 days') as clients_7d
    ),
    groomer_actions as (
      select
        (select count(*)::int from public.appointments
          where org_id = p_org_id
            and type = 'grooming'
            and status = 'completed'
            and date >= (now() - interval '7 days')::date) as groomings_7d
    ),
    roles_fixed as (
      select unnest(array['admin','vet','receptionist','groomer']) as role
    )
  select jsonb_agg(
    jsonb_build_object(
      'role', rf.role,
      'active_members_7d', coalesce(mbr.active_7d, 0),
      'primary_action_label',
        case rf.role
          when 'admin'        then 'Logins últimos 7d'
          when 'vet'          then 'Consultas + recetas 7d'
          when 'receptionist' then 'Citas + clientes 7d'
          when 'groomer'      then 'Servicios completados 7d'
        end,
      'primary_action_count',
        case rf.role
          when 'admin'        then coalesce(mbr.active_7d, 0)
          when 'vet'          then (select consults_7d + rx_7d from vet_actions)
          when 'receptionist' then (select appts_7d + clients_7d from recep_actions)
          when 'groomer'      then (select groomings_7d from groomer_actions)
        end
    )
    order by
      case rf.role
        when 'admin' then 0
        when 'vet' then 1
        when 'receptionist' then 2
        when 'groomer' then 3
      end
  )
  into v_adoption
  from roles_fixed rf
  left join members_by_role mbr on mbr.role = rf.role;

  return jsonb_build_object(
    'identity', v_identity,
    'members',  v_members,
    'activity', v_activity,
    'adoption', v_adoption
  );
end;
$$;

comment on function public.superadmin_org_detail(uuid) is
  'Panel superadmin Fase 2: devuelve JSON con identity/members/activity/adoption de una clínica. Requiere is_platform_admin()=true.';

revoke all on function public.superadmin_org_detail(uuid) from public;
grant execute on function public.superadmin_org_detail(uuid) to authenticated;
