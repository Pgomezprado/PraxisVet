-- ============================================
-- Superadmin — volver a modo soft (sin MFA)
-- ============================================
-- La migración 20260417000300_superadmin_strict_mode.sql activó el
-- requisito de MFA. Por decisión del fundador se vuelve a modo soft
-- (sin MFA) por ahora. El endurecimiento queda como deuda a activar
-- antes del primer cliente pagando / producción real.

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
  'Soft mode: true si el usuario tiene fila activa en platform_admins. MFA no requerido (deuda técnica pendiente).';
