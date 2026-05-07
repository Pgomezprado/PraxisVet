-- Fix de la migración 20260506100000_personal_org_for_tutor.sql:
-- el RPC creaba la org con plan='free', pero el CHECK constraint actual
-- solo acepta ('basico', 'pro', 'enterprise'). Reemplazamos por 'basico'.

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
    SELECT c.id INTO v_client_id
    FROM public.clients c
    WHERE c.org_id = v_org_id
    ORDER BY c.created_at ASC
    LIMIT 1;

    IF v_client_id IS NULL THEN
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

  -- Caso 2: crear todo. Plan 'basico' (no 'free' — ese valor ya no existe
  -- desde la migración del trial gateway).
  v_short_uid := substring(replace(v_user_id::text, '-', ''), 1, 12);

  INSERT INTO public.organizations (name, slug, plan, active, is_personal)
  VALUES (
    'Mis mascotas',
    'personal-' || v_short_uid,
    'basico',
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
