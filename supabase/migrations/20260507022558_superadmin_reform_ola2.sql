-- ============================================
-- Superadmin Reform Ola 2 — Notas, Founder toggle, Funnel, Activity 30d
-- ============================================
-- Objetivo: completar el panel /superadmin con 5 piezas que cierran la
-- experiencia de Pablo gestionando fundadoras y prospectos:
--
--   1. `superadmin_clinic_notes` — notas comerciales/CRM por clínica.
--      Inmutables: si Pablo se equivoca, agrega nota nueva.
--   2. RPC `superadmin_set_founder` — marca/desmarca is_founder + audit.
--   3. RPC `superadmin_add_clinic_note` — inserta nota + audit.
--   4. RPC `superadmin_list_clinic_notes` — lee notas con email autor.
--   5. RPC `superadmin_funnel_overview` — embudo Hub → signup → trial → pago → fundadora.
--   6. RPC `superadmin_clinic_activity_30d` — serie 30d (consultas/grooming/citas).
--
-- Seguridad: cada RPC hace SECURITY DEFINER + check `is_platform_admin()`.
-- Sin platform admin → excepción 'forbidden' (errcode 42501).
--
-- Notas de auditoría:
--   `superadmin_audit_log` exige `ip`, `user_agent`, `request_id`, `admin_email`
--   NOT NULL. Como un RPC no tiene acceso al request, usamos sentinelas:
--     ip = '0.0.0.0', user_agent = 'rpc:superadmin', request_id = gen_random_uuid().
--   La capa Server Action puede registrar un evento adicional con el contexto
--   real del request (esto es el segundo registro, no este).

-- ===========================================================================
-- 1) Tabla superadmin_clinic_notes
-- ===========================================================================
create table if not exists public.superadmin_clinic_notes (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  body        text not null check (length(trim(body)) > 0),
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now()
);

comment on table public.superadmin_clinic_notes is
  'Notas comerciales/CRM por clínica, escritas desde el panel superadmin. Inmutables (no UPDATE/DELETE para authenticated).';

create index if not exists idx_superadmin_clinic_notes_org_created
  on public.superadmin_clinic_notes (org_id, created_at desc);

alter table public.superadmin_clinic_notes enable row level security;
alter table public.superadmin_clinic_notes force row level security;

-- Revocar todo a roles públicos por defecto
revoke all on public.superadmin_clinic_notes from public, anon, authenticated;

-- SELECT solo si is_platform_admin
drop policy if exists "platform_admins_select_notes" on public.superadmin_clinic_notes;
create policy "platform_admins_select_notes"
  on public.superadmin_clinic_notes for select
  to authenticated
  using (public.is_platform_admin());

-- INSERT solo si is_platform_admin AND created_by = auth.uid()
drop policy if exists "platform_admins_insert_notes" on public.superadmin_clinic_notes;
create policy "platform_admins_insert_notes"
  on public.superadmin_clinic_notes for insert
  to authenticated
  with check (
    public.is_platform_admin()
    and created_by = auth.uid()
  );

-- Sin policies de UPDATE/DELETE → bloqueado para authenticated.
-- service_role bypassea RLS y conserva permisos por GRANT (necesario si Pablo
-- decide borrar manualmente desde Supabase Studio con service key).
grant select, insert on public.superadmin_clinic_notes to authenticated;
grant select, insert, update, delete on public.superadmin_clinic_notes to service_role;

-- ===========================================================================
-- 2) RPC superadmin_set_founder
-- ===========================================================================
create or replace function public.superadmin_set_founder(
  p_org_id     uuid,
  p_is_founder boolean
)
returns void
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  v_admin_id uuid;
  v_admin_email text;
  v_org_exists boolean;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden: caller is not a platform admin'
      using errcode = '42501';
  end if;

  v_admin_id := auth.uid();
  select email into v_admin_email from auth.users where id = v_admin_id;

  -- Validar org existe (evita updates silenciosos sobre 0 filas)
  select exists(select 1 from public.organizations where id = p_org_id)
    into v_org_exists;
  if not v_org_exists then
    raise exception 'org_not_found' using errcode = 'P0002';
  end if;

  update public.organizations
     set is_founder = p_is_founder
   where id = p_org_id;

  insert into public.superadmin_audit_log (
    admin_user_id, admin_email, event_type, target_clinic_id,
    target_entity, target_entity_id,
    ip, user_agent, request_id, success, metadata
  ) values (
    v_admin_id, coalesce(v_admin_email, 'unknown@rpc'),
    'clinic.set_founder', p_org_id,
    'organizations', p_org_id,
    '0.0.0.0', 'rpc:superadmin', gen_random_uuid(),
    true,
    jsonb_build_object('is_founder', p_is_founder)
  );
end;
$$;

comment on function public.superadmin_set_founder(uuid, boolean) is
  'Marca/desmarca organizations.is_founder. Audita en superadmin_audit_log con event_type=clinic.set_founder. Requiere is_platform_admin().';

revoke all on function public.superadmin_set_founder(uuid, boolean) from public;
grant execute on function public.superadmin_set_founder(uuid, boolean) to authenticated;

-- ===========================================================================
-- 3) RPC superadmin_add_clinic_note
-- ===========================================================================
create or replace function public.superadmin_add_clinic_note(
  p_org_id uuid,
  p_body   text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  v_admin_id uuid;
  v_admin_email text;
  v_org_exists boolean;
  v_note_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden: caller is not a platform admin'
      using errcode = '42501';
  end if;

  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'body_empty' using errcode = '22023';
  end if;

  v_admin_id := auth.uid();
  select email into v_admin_email from auth.users where id = v_admin_id;

  select exists(select 1 from public.organizations where id = p_org_id)
    into v_org_exists;
  if not v_org_exists then
    raise exception 'org_not_found' using errcode = 'P0002';
  end if;

  insert into public.superadmin_clinic_notes (org_id, body, created_by)
  values (p_org_id, trim(p_body), v_admin_id)
  returning id into v_note_id;

  insert into public.superadmin_audit_log (
    admin_user_id, admin_email, event_type, target_clinic_id,
    target_entity, target_entity_id,
    ip, user_agent, request_id, success, metadata
  ) values (
    v_admin_id, coalesce(v_admin_email, 'unknown@rpc'),
    'clinic.add_note', p_org_id,
    'superadmin_clinic_notes', v_note_id,
    '0.0.0.0', 'rpc:superadmin', gen_random_uuid(),
    true,
    jsonb_build_object('note_length', length(trim(p_body)))
  );

  return v_note_id;
end;
$$;

comment on function public.superadmin_add_clinic_note(uuid, text) is
  'Inserta una nota comercial inmutable en superadmin_clinic_notes y audita event_type=clinic.add_note. Devuelve el id de la nota.';

revoke all on function public.superadmin_add_clinic_note(uuid, text) from public;
grant execute on function public.superadmin_add_clinic_note(uuid, text) to authenticated;

-- ===========================================================================
-- 4) RPC superadmin_list_clinic_notes
-- ===========================================================================
create or replace function public.superadmin_list_clinic_notes(p_org_id uuid)
returns table (
  id           uuid,
  body         text,
  created_at   timestamptz,
  author_email text
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
    select
      n.id,
      n.body,
      n.created_at,
      u.email::text as author_email
    from public.superadmin_clinic_notes n
    left join auth.users u on u.id = n.created_by
    where n.org_id = p_org_id
    order by n.created_at desc;
end;
$$;

comment on function public.superadmin_list_clinic_notes(uuid) is
  'Lista notas comerciales de una clínica (orden created_at desc) con email del autor. Requiere is_platform_admin().';

revoke all on function public.superadmin_list_clinic_notes(uuid) from public;
grant execute on function public.superadmin_list_clinic_notes(uuid) to authenticated;

-- ===========================================================================
-- 5) RPC superadmin_funnel_overview
-- ===========================================================================
create or replace function public.superadmin_funnel_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_tutors_hub      int;
  v_signups         int;  -- toda org no-personal
  v_trial_active    int;
  v_paid            int;
  v_founders        int;
  v_cancelled       int;
  v_expired         int;
  v_signup_to_trial numeric;
  v_trial_to_paid   numeric;
  v_paid_to_founder numeric;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden: caller is not a platform admin'
      using errcode = '42501';
  end if;

  -- Tutores Hub (orgs personales)
  select count(*)::int into v_tutors_hub
  from public.organizations
  where coalesce(is_personal, false) = true;

  -- Signups: toda clínica registrada (no personal)
  select count(*)::int into v_signups
  from public.organizations
  where coalesce(is_personal, false) = false;

  -- Trial activo: status='trial' y trial_ends_at >= now()
  select count(*)::int into v_trial_active
  from public.organizations
  where coalesce(is_personal, false) = false
    and coalesce(subscription_status, 'trial') = 'trial'
    and trial_ends_at is not null
    and trial_ends_at >= now();

  -- Pagadas: subscription_status='active'
  select count(*)::int into v_paid
  from public.organizations
  where coalesce(is_personal, false) = false
    and subscription_status = 'active';

  -- Cancelled / expired (para denominador de trial->paid)
  select
    count(*) filter (where subscription_status = 'cancelled')::int,
    count(*) filter (where subscription_status = 'expired')::int
  into v_cancelled, v_expired
  from public.organizations
  where coalesce(is_personal, false) = false;

  -- Fundadoras
  select count(*)::int into v_founders
  from public.organizations
  where coalesce(is_personal, false) = false
    and is_founder = true;

  -- Tasas (0..1, NULL si denominador es 0)
  v_signup_to_trial := case
    when v_signups > 0 then round(v_trial_active::numeric / v_signups::numeric, 4)
    else null
  end;

  v_trial_to_paid := case
    when (v_paid + v_cancelled + v_expired) > 0
      then round(v_paid::numeric / (v_paid + v_cancelled + v_expired)::numeric, 4)
    else null
  end;

  v_paid_to_founder := case
    when v_paid > 0 then round(v_founders::numeric / v_paid::numeric, 4)
    else null
  end;

  return jsonb_build_object(
    'stages', jsonb_build_array(
      jsonb_build_object('key', 'tutors_hub',   'label', 'Tutores Hub',          'count', v_tutors_hub),
      jsonb_build_object('key', 'signups',      'label', 'Clínicas registradas', 'count', v_signups),
      jsonb_build_object('key', 'trial_active', 'label', 'En trial activo',      'count', v_trial_active),
      jsonb_build_object('key', 'paid',         'label', 'Pagadas',              'count', v_paid),
      jsonb_build_object('key', 'founders',     'label', 'Fundadoras',           'count', v_founders)
    ),
    'rates', jsonb_build_object(
      'signup_to_trial', v_signup_to_trial,
      'trial_to_paid',   v_trial_to_paid,
      'paid_to_founder', v_paid_to_founder
    )
  );
end;
$$;

comment on function public.superadmin_funnel_overview() is
  'Embudo de conversión: Hub → signups → trial activo → pagadas → fundadoras + tasas. Requiere is_platform_admin().';

revoke all on function public.superadmin_funnel_overview() from public;
grant execute on function public.superadmin_funnel_overview() to authenticated;

-- ===========================================================================
-- 6) RPC superadmin_clinic_activity_30d
-- ===========================================================================
-- Devuelve siempre 30 filas (últimos 30 días incluyendo hoy), con 0 cuando
-- no hubo actividad ese día. Se usa para gráfico de barras en detalle de org.
create or replace function public.superadmin_clinic_activity_30d(p_org_id uuid)
returns table (
  day            date,
  consultations  int,
  groomings      int,
  appointments   int
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_org_exists boolean;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden: caller is not a platform admin'
      using errcode = '42501';
  end if;

  select exists(select 1 from public.organizations where id = p_org_id)
    into v_org_exists;
  if not v_org_exists then
    raise exception 'org_not_found' using errcode = 'P0002';
  end if;

  return query
  with
    days as (
      select d::date as day
      from generate_series(
        (now()::date - interval '29 days')::date,
        now()::date,
        interval '1 day'
      ) d
    ),
    cr as (
      select created_at::date as day, count(*)::int as n
      from public.clinical_records
      where org_id = p_org_id
        and created_at >= now() - interval '30 days'
      group by 1
    ),
    gr as (
      select created_at::date as day, count(*)::int as n
      from public.grooming_records
      where org_id = p_org_id
        and created_at >= now() - interval '30 days'
      group by 1
    ),
    ap as (
      select created_at::date as day, count(*)::int as n
      from public.appointments
      where org_id = p_org_id
        and created_at >= now() - interval '30 days'
      group by 1
    )
  select
    d.day,
    coalesce(cr.n, 0) as consultations,
    coalesce(gr.n, 0) as groomings,
    coalesce(ap.n, 0) as appointments
  from days d
  left join cr on cr.day = d.day
  left join gr on gr.day = d.day
  left join ap on ap.day = d.day
  order by d.day asc;
end;
$$;

comment on function public.superadmin_clinic_activity_30d(uuid) is
  'Serie de 30 días (incluye hoy) con consultas/grooming/citas creadas en esa fecha. Días sin actividad devuelven 0. Requiere is_platform_admin().';

revoke all on function public.superadmin_clinic_activity_30d(uuid) from public;
grant execute on function public.superadmin_clinic_activity_30d(uuid) to authenticated;
