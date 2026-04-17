-- ============================================
-- Superadmin Fase 1 — modo soft (sin MFA)
-- ============================================
-- Fase 1 del panel superadmin: Pablo (fundador) necesita acceder al
-- dashboard ANTES de tener MFA enrolado. La función original
-- `is_platform_admin()` exige `mfa_enrolled_at is not null`, que es
-- correcto como hardening a futuro pero bloquea el uso inmediato.
--
-- Solución: redefinir `is_platform_admin()` para que el requisito de
-- MFA sea OPCIONAL por ahora. Cuando Pablo habilite MFA, la fila ya
-- tendrá `mfa_enrolled_at` y el chequeo adicional del guard
-- `requireAal2()` en Next.js se encargará del refuerzo por sesión.
--
-- Defensa en profundidad que se mantiene:
--   1. RLS self_select en platform_admins.
--   2. revoked_at debe ser NULL.
--   3. El panel sigue siendo read-only (sólo policies SELECT y RPCs).
--   4. El guard en Next.js valida user + role en cada request.
--
-- Cuando Fase 2 active MFA obligatorio, bastará con volver a agregar
-- `and pa.mfa_enrolled_at is not null` aquí (ya está documentado).

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
  );
$$;

comment on function public.is_platform_admin() is
  'Fase 1 (sin MFA): true si el usuario tiene fila activa en platform_admins. Fase 2 reintroducirá mfa_enrolled_at is not null.';
