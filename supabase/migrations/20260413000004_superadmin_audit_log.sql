-- ============================================
-- Superadmin 0004 — superadmin_audit_log
-- ============================================
-- Append-only. Registra cada acción (incluyendo lecturas) que un
-- platform admin realiza a través del panel superadmin. Es la
-- evidencia forense del uso de la "llave maestra".
--
-- Postura: el rol `service_role` es el único que puede INSERT, y
-- NADIE (ni siquiera service_role) puede UPDATE/DELETE. Esto se
-- hace con GRANT/REVOKE; Postgres no permite a un rol saltar sus
-- propios permisos de tabla aun siendo superuser lógico de RLS.
--
-- Índices pensados para las tres queries del panel:
--   * timeline por admin
--   * timeline por clinic objetivo
--   * timeline por tipo de evento

create table if not exists public.superadmin_audit_log (
  id                 bigint generated always as identity primary key,
  occurred_at        timestamptz not null default now(),
  admin_user_id      uuid not null references auth.users(id),
  admin_email        text not null,
  event_type         text not null,
  -- target_clinic_id mantiene el nombre del lenguaje de negocio
  -- ("clínica") aunque la tabla física sea public.organizations.
  target_clinic_id   uuid references public.organizations(id) on delete set null,
  target_entity      text,
  target_entity_id   uuid,
  http_method        text,
  route              text,
  query_params       jsonb,
  ip                 inet not null,
  user_agent         text not null,
  request_id         uuid not null,
  session_id         uuid,
  success            boolean not null,
  error_message      text,
  metadata           jsonb
);

comment on table public.superadmin_audit_log is
  'Append-only. Cada acción del panel superadmin se registra aquí. Nunca UPDATE/DELETE.';

create index if not exists superadmin_audit_log_admin_idx
  on public.superadmin_audit_log (admin_user_id, occurred_at desc);

create index if not exists superadmin_audit_log_clinic_idx
  on public.superadmin_audit_log (target_clinic_id, occurred_at desc);

create index if not exists superadmin_audit_log_event_idx
  on public.superadmin_audit_log (event_type, occurred_at desc);

alter table public.superadmin_audit_log enable row level security;
alter table public.superadmin_audit_log force row level security;

-- Append-only a nivel de permisos: revocar update/delete a TODOS los roles.
revoke all on public.superadmin_audit_log from public, anon, authenticated;
revoke update, delete on public.superadmin_audit_log from public, anon, authenticated;

-- SELECT permitido a authenticated sólo si es platform admin activo con MFA.
drop policy if exists "platform_admins_select_audit" on public.superadmin_audit_log;
create policy "platform_admins_select_audit"
  on public.superadmin_audit_log for select
  to authenticated
  using (public.is_platform_admin());

-- Grants mínimos:
--   * authenticated: sólo SELECT (filtrado por la policy anterior).
--   * service_role: sólo INSERT. Revocamos update/delete explícitamente.
grant select on public.superadmin_audit_log to authenticated;

-- service_role bypasea RLS pero respeta los GRANT de tabla. Forzamos
-- que ni siquiera él pueda mutar filas existentes.
revoke update, delete on public.superadmin_audit_log from service_role;
grant insert, select on public.superadmin_audit_log to service_role;
-- El identity es generated always; no hace falta grant sobre secuencia.
