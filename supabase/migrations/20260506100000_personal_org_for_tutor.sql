-- Bloque 3a — Modo "tutor sin clínica conectada".
--
-- Visión: que un dueño de mascota pueda registrar a su regalón en PraxisVet
-- sin que su veterinaria esté en el sistema. Cuando algún día su clínica
-- se sume, los datos del tutor quedan listos para enlazarse.
--
-- Decisión arquitectónica (CoFounder + UXDesigner 2026-05-06):
--   Cada tutor sin clínica obtiene una "clínica personal invisible" propia.
--   El tutor es admin de esa org. Las RLS existentes funcionan tal cual
--   porque el tutor ES miembro de su propia org (no hay caso especial).
--
--   La org personal NO es accesible desde el backoffice (`/[clinic]`):
--   el flag `is_personal=true` la marca para que el layout del backoffice
--   la rechace y la redirija a `/mascotas`.
--
-- Lo que hace esta migración:
--   1. Agregar `organizations.is_personal boolean` (default false).
--   2. Función `ensure_personal_org_for_tutor(p_first_name, p_last_name)`
--      que crea (o devuelve existente) la org personal + membership admin
--      + cliente "self" del tutor.
--
-- Lo que NO hace (a propósito):
--   - No toca RLS de pets, vaccinations ni dewormings. Funcionan tal cual
--     porque el tutor es admin de su org personal.
--   - No mueve datos de orgs reales. Las clínicas existentes quedan intactas.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_personal boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_organizations_is_personal
  ON public.organizations (is_personal)
  WHERE is_personal = true;

COMMENT ON COLUMN public.organizations.is_personal IS
  'true cuando la org representa el espacio personal de un tutor sin clínica conectada. No accesible desde /[clinic]; solo se muestra en /mascotas.';

-- ===========================================================================
-- Función: ensure_personal_org_for_tutor
-- ---------------------------------------------------------------------------
-- Garantiza que el usuario autenticado tenga una "org personal" lista para
-- registrar mascotas. Es idempotente: si ya existe, devuelve la existente.
--
-- Devuelve: { org_id uuid, client_id uuid }
--
-- Seguridad: SECURITY DEFINER porque crea filas en organizations,
-- organization_members y clients (todas con RLS estricta). El runtime
-- valida que auth.uid() existe antes de invocar.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.ensure_personal_org_for_tutor(
  p_first_name text,
  p_last_name text
)
RETURNS TABLE (org_id uuid, client_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_client_id uuid;
  v_first text := nullif(trim(p_first_name), '');
  v_last text := nullif(trim(p_last_name), '');
  v_short_uid text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth.uid() es null — solo usuarios autenticados pueden crear su org personal';
  END IF;

  -- Caso 1: ya existe la org personal del tutor.
  SELECT om.org_id INTO v_org_id
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.org_id
  WHERE om.user_id = v_user_id
    AND o.is_personal = true
    AND om.active = true
    AND o.active = true
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    -- Buscar el cliente "self" en esa org. Lo identificamos como el cliente
    -- creado por el tutor mismo (suele ser único en una org personal).
    SELECT c.id INTO v_client_id
    FROM public.clients c
    WHERE c.org_id = v_org_id
    ORDER BY c.created_at ASC
    LIMIT 1;

    IF v_client_id IS NULL THEN
      -- Edge case: org existe pero sin cliente. Crearlo ahora.
      INSERT INTO public.clients (org_id, first_name, last_name)
      VALUES (
        v_org_id,
        coalesce(v_first, 'Tutor'),
        coalesce(v_last, '')
      )
      RETURNING id INTO v_client_id;
    END IF;

    org_id := v_org_id;
    client_id := v_client_id;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Caso 2: hay que crear todo de cero.
  v_short_uid := substring(replace(v_user_id::text, '-', ''), 1, 12);

  INSERT INTO public.organizations (name, slug, plan, active, is_personal)
  VALUES (
    'Mis mascotas',
    'personal-' || v_short_uid,
    'free',
    true,
    true
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (
    user_id,
    org_id,
    role,
    first_name,
    last_name,
    active
  )
  VALUES (
    v_user_id,
    v_org_id,
    'admin',
    coalesce(v_first, 'Tutor'),
    coalesce(v_last, ''),
    true
  );

  INSERT INTO public.clients (org_id, first_name, last_name)
  VALUES (
    v_org_id,
    coalesce(v_first, 'Tutor'),
    coalesce(v_last, '')
  )
  RETURNING id INTO v_client_id;

  org_id := v_org_id;
  client_id := v_client_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_personal_org_for_tutor(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_personal_org_for_tutor(text, text) TO authenticated;

COMMENT ON FUNCTION public.ensure_personal_org_for_tutor(text, text) IS
  'Idempotente: garantiza org personal + cliente self del tutor autenticado. Devuelve org_id, client_id.';
