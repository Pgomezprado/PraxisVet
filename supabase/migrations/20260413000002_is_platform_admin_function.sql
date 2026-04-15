-- ============================================
-- Superadmin 0002 — is_platform_admin() function
-- ============================================
-- Predicado central usado por policies RLS del panel superadmin.
--
-- Reglas:
--   1. Debe existir fila en platform_admins para auth.uid().
--   2. revoked_at debe ser NULL.
--   3. mfa_enrolled_at NO puede ser NULL. Sin MFA enrolado, el
--      usuario no es considerado platform admin bajo ninguna
--      circunstancia — defensa contra compromiso de credenciales
--      sin segundo factor.
--
-- Nota: el chequeo del nivel de autenticación actual (AAL2) se hace
-- en el server layer de Next (requireAal2), no en esta función SQL,
-- porque la claim viaja en el JWT y no es accesible como tal desde
-- un security definer sin parseo manual.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
      and pa.revoked_at is null
      and pa.mfa_enrolled_at is not null
  );
$$;

comment on function public.is_platform_admin() is
  'True si el usuario actual tiene fila activa en platform_admins con MFA enrolado. Úsese sólo en policies de SELECT.';

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;
