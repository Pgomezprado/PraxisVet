-- ============================================
-- Superadmin 0001 — platform_admins
-- ============================================
-- Tabla de "llave maestra" que identifica qué usuarios de auth.users
-- pueden cruzar el aislamiento multi-tenant vía el panel superadmin.
--
-- Postura de seguridad: paranoica. La tabla es invisible para el
-- cliente excepto por la propia fila del usuario (para chequeos
-- client-side de UI). Las mutaciones SOLO ocurren con service_role
-- (fuera de la app, vía SQL directo contra Supabase).

create table if not exists public.platform_admins (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  role             text not null check (role in ('owner','staff')) default 'staff',
  created_at       timestamptz not null default now(),
  created_by       uuid references auth.users(id),
  revoked_at       timestamptz,
  mfa_enrolled_at  timestamptz,
  notes            text
);

comment on table public.platform_admins is
  'Usuarios autorizados a operar el panel superadmin de PraxisVet. Append-only desde la app; mutaciones sólo vía service_role.';
comment on column public.platform_admins.role is
  'owner = Pablo u otro founder; staff = operador con permisos limitados.';
comment on column public.platform_admins.revoked_at is
  'Si no es null, la fila queda inactiva. Nunca borrar filas: preservar historial para auditoría.';
comment on column public.platform_admins.mfa_enrolled_at is
  'Timestamp en el que el usuario completó el enrolamiento TOTP. is_platform_admin() exige que esto NO sea null.';

-- Índice parcial: el lookup común es "¿existe fila activa para este user?"
create index if not exists platform_admins_active_idx
  on public.platform_admins (user_id)
  where revoked_at is null;

-- RLS ON
alter table public.platform_admins enable row level security;
alter table public.platform_admins force row level security;

-- SELECT: sólo la propia fila (para que el cliente pueda saber
-- si la UI debe mostrar el link al panel). Cero leakage cruzado.
drop policy if exists "platform_admins_self_select" on public.platform_admins;
create policy "platform_admins_self_select"
  on public.platform_admins
  for select
  to authenticated
  using (user_id = auth.uid());

-- INSERT/UPDATE/DELETE: NO hay policy para authenticated => negado.
-- service_role bypasea RLS por diseño de Supabase, así que sigue
-- pudiendo escribir. Además, revocamos privilegios de tabla al
-- rol `authenticated` y `anon` como defensa en profundidad.
revoke all on public.platform_admins from anon;
revoke insert, update, delete on public.platform_admins from authenticated;
-- Dejamos SELECT a authenticated porque la policy ya lo filtra a la propia fila.
grant select on public.platform_admins to authenticated;
