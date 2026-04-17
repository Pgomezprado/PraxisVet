-- ============================================
-- Superadmin Fase 1 — superadmin_clinics_overview
-- ============================================
-- Función RPC que devuelve una fila por clínica (organization) con
-- métricas precomputadas para el panel superadmin:
--   - clínica (id, name, slug, plan, created_at)
--   - last_sign_in_at  → MAX(last_sign_in_at) de miembros
--   - active_members_7d / total_members
--   - consultations_7d → clinical_records creados en los últimos 7 días
--   - pets_count        → total de mascotas
--   - alert_level       → 'zombie' | 'team_inactive' | 'ok'
--
-- Seguridad: SECURITY DEFINER, valida `public.is_platform_admin()` como
-- primera línea. Si el caller no es platform admin, levanta excepción.
-- No hay otra vía de lectura: ni vista, ni tabla pública.
--
-- Nota: las policies de lectura elevadas (platform_admins_read_all) que
-- ya existen sobre organizations/organization_members/etc. permitirían
-- hacer estas agregaciones desde el server con SELECTs normales, pero:
--   (a) serían N+1 o joins costosos desde el front,
--   (b) auth.users no es legible ni siquiera con esas policies,
-- por eso consolidamos todo en esta función.

create or replace function public.superadmin_clinics_overview()
returns table (
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
  alert_level         text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden: caller is not a platform admin'
      using errcode = '42501';
  end if;

  return query
  with
    members as (
      select
        om.org_id,
        om.user_id,
        u.last_sign_in_at
      from public.organization_members om
      left join auth.users u on u.id = om.user_id
      where om.active = true
    ),
    member_stats as (
      select
        m.org_id,
        count(*)::bigint                                              as total_members,
        count(*) filter (
          where m.last_sign_in_at is not null
            and m.last_sign_in_at >= now() - interval '7 days'
        )::bigint                                                     as active_members_7d,
        max(m.last_sign_in_at)                                        as last_sign_in_at
      from members m
      group by m.org_id
    ),
    consultation_stats as (
      select
        cr.org_id,
        count(*)::bigint as consultations_7d
      from public.clinical_records cr
      where cr.created_at >= now() - interval '7 days'
      group by cr.org_id
    ),
    pet_stats as (
      select
        p.org_id,
        count(*)::bigint as pets_count
      from public.pets p
      group by p.org_id
    )
  select
    o.id                                                 as org_id,
    o.name                                               as org_name,
    o.slug                                               as org_slug,
    coalesce(o.plan, 'free')                             as org_plan,
    o.created_at                                         as org_created_at,
    coalesce(ms.total_members, 0)                        as total_members,
    coalesce(ms.active_members_7d, 0)                    as active_members_7d,
    ms.last_sign_in_at                                   as last_sign_in_at,
    coalesce(cs.consultations_7d, 0)                     as consultations_7d,
    coalesce(ps.pets_count, 0)                           as pets_count,
    case
      when ms.last_sign_in_at is null
        or ms.last_sign_in_at < now() - interval '7 days'
        then 'zombie'
      when coalesce(ms.total_members, 0) > 0
        and (coalesce(ms.active_members_7d, 0)::numeric
             / nullif(ms.total_members, 0)::numeric) < 0.5
        then 'team_inactive'
      else 'ok'
    end                                                  as alert_level
  from public.organizations o
  left join member_stats       ms on ms.org_id = o.id
  left join consultation_stats cs on cs.org_id = o.id
  left join pet_stats          ps on ps.org_id = o.id
  order by
    case
      when ms.last_sign_in_at is null or ms.last_sign_in_at < now() - interval '7 days' then 0
      when coalesce(ms.total_members, 0) > 0
        and (coalesce(ms.active_members_7d, 0)::numeric
             / nullif(ms.total_members, 0)::numeric) < 0.5 then 1
      else 2
    end asc,
    ms.last_sign_in_at asc nulls first;
end;
$$;

comment on function public.superadmin_clinics_overview() is
  'Panel superadmin: una fila por clínica con métricas agregadas. Requiere is_platform_admin()=true.';

revoke all on function public.superadmin_clinics_overview() from public;
grant execute on function public.superadmin_clinics_overview() to authenticated;
