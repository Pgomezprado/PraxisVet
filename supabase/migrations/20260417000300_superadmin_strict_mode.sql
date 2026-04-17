-- ============================================
-- Superadmin Fase 2 — strict mode (MFA obligatorio)
-- ============================================
-- Revierte `is_platform_admin()` a la versión estricta original:
-- exige fila activa en platform_admins CON mfa_enrolled_at no nulo.
--
-- Complementa al guard `requirePlatformAdmin()` de Next.js que además
-- valida AAL2 (MFA verificado en la sesión actual). Defensa en
-- profundidad: la DB bloquea por falta de enrolamiento y la app bloquea
-- por falta de AAL2 en la sesión.
--
-- Deja obsoleta la migración 20260417000201_superadmin_soft_mode.sql,
-- que NO se elimina (preservamos historial de migraciones).

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
  'Fase 2 (strict): true si el usuario tiene fila activa en platform_admins con MFA enrolado. El guard de Next.js además exige AAL2 en la sesión actual.';
