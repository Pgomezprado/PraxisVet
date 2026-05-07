-- ============================================
-- Superadmin Reform Ola 3 — Plan check fix + Notas pinneables + Tutor Hub detail
-- ============================================
-- Cierra la reforma del panel /superadmin con 5 cambios:
--   A) Re-asegurar que el CHECK de organizations.plan acepta 'basico'.
--      (Ya hubo una migración previa — 20260417000500 — que lo arregló, pero
--      la consigna pide reforzarlo de forma idempotente para que cualquier
--      ambiente quede consistente. Drop & re-add con el set definitivo.)
--   B) Agregar superadmin_clinic_notes.is_pinned + index parcial.
--   C) RPC superadmin_toggle_pin_note(p_note_id) con audit log.
--   D) Extender superadmin_list_clinic_notes con author_name + is_pinned
--      (cambia firma → DROP + CREATE). Pineadas primero, luego más recientes.
--   E) RPC superadmin_tutor_hub_detail(p_org_id) → JSON con tutor + pets +
--      activity. Solo orgs is_personal=true.
--
-- Seguridad: cada RPC hace SECURITY DEFINER + check is_platform_admin().
-- Sin platform admin → excepción 'forbidden' (errcode 42501).
--
-- Notas inmutables: el body sigue siendo append-only; is_pinned NO es
-- contenido sino metadato visual, por lo que sí puede mutar.

-- ===========================================================================
-- A) Fix CHECK constraint de organizations.plan
-- ===========================================================================
-- Idempotente: si ya existe lo dropea y re-crea. Garantiza que 'basico' está
-- en el set permitido (la migración 20260417000500 ya hizo esto, pero algunos
-- ambientes pueden tener restos del CHECK viejo `('free','pro','enterprise')`).
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_plan_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_plan_check
  CHECK (plan IN ('basico', 'pro', 'enterprise'));

COMMENT ON CONSTRAINT organizations_plan_check ON public.organizations IS
  'Planes válidos del MVP: basico ($29k), pro ($79k), enterprise ($149k). El antiguo "free" fue migrado a "basico" en 20260417000500.';

-- ===========================================================================
-- B) superadmin_clinic_notes.is_pinned
-- ===========================================================================
ALTER TABLE public.superadmin_clinic_notes
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.superadmin_clinic_notes.is_pinned IS
  'true si la nota debe aparecer pineada al tope del panel de la clínica. Es metadato visual (mutable), el body sigue siendo inmutable.';

-- Index parcial para queries rápidas: trae las pineadas de una org.
CREATE INDEX IF NOT EXISTS idx_superadmin_clinic_notes_pinned
  ON public.superadmin_clinic_notes (org_id)
  WHERE is_pinned = true;

-- ===========================================================================
-- C) RPC superadmin_toggle_pin_note
-- ===========================================================================
-- Nota: la tabla tiene RLS sin policy de UPDATE para authenticated, pero este
-- RPC es SECURITY DEFINER → corre como owner y bypassea RLS para el toggle.
-- El check is_platform_admin() es la única barrera; equivalente a la policy.
CREATE OR REPLACE FUNCTION public.superadmin_toggle_pin_note(p_note_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_admin_id uuid;
  v_admin_email text;
  v_org_id uuid;
  v_new_value boolean;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden: caller is not a platform admin'
      USING errcode = '42501';
  END IF;

  v_admin_id := auth.uid();
  SELECT email INTO v_admin_email FROM auth.users WHERE id = v_admin_id;

  -- Validar nota existe y obtener org_id (para audit log)
  SELECT org_id INTO v_org_id
  FROM public.superadmin_clinic_notes
  WHERE id = p_note_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'note_not_found' USING errcode = 'P0002';
  END IF;

  -- Toggle del flag y devolver el nuevo valor
  UPDATE public.superadmin_clinic_notes
     SET is_pinned = NOT is_pinned
   WHERE id = p_note_id
  RETURNING is_pinned INTO v_new_value;

  -- Audit log
  INSERT INTO public.superadmin_audit_log (
    admin_user_id, admin_email, event_type, target_clinic_id,
    target_entity, target_entity_id,
    ip, user_agent, request_id, success, metadata
  ) VALUES (
    v_admin_id, coalesce(v_admin_email, 'unknown@rpc'),
    'clinic.toggle_pin_note', v_org_id,
    'superadmin_clinic_notes', p_note_id,
    '0.0.0.0', 'rpc:superadmin', gen_random_uuid(),
    true,
    jsonb_build_object(
      'note_id',   p_note_id,
      'new_value', v_new_value
    )
  );

  RETURN v_new_value;
END;
$$;

COMMENT ON FUNCTION public.superadmin_toggle_pin_note(uuid) IS
  'Toggle is_pinned en una nota de superadmin_clinic_notes. Audita event_type=clinic.toggle_pin_note. Devuelve el nuevo valor de is_pinned.';

REVOKE ALL ON FUNCTION public.superadmin_toggle_pin_note(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.superadmin_toggle_pin_note(uuid) TO authenticated;

-- ===========================================================================
-- D) superadmin_list_clinic_notes — agregar author_name + is_pinned
-- ===========================================================================
-- BREAKING para el frontend: cambia la firma de RETURNS TABLE.
-- Por eso DROP antes de CREATE (PostgreSQL no permite cambiar columnas
-- de retorno con CREATE OR REPLACE).
DROP FUNCTION IF EXISTS public.superadmin_list_clinic_notes(uuid);

CREATE OR REPLACE FUNCTION public.superadmin_list_clinic_notes(p_org_id uuid)
RETURNS TABLE (
  id           uuid,
  body         text,
  created_at   timestamptz,
  author_email text,
  author_name  text,
  is_pinned    boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden: caller is not a platform admin'
      USING errcode = '42501';
  END IF;

  RETURN QUERY
    SELECT
      n.id,
      n.body,
      n.created_at,
      u.email::text AS author_email,
      -- author_name: derivado de raw_user_meta_data (first_name + last_name).
      -- Si ambos NULL/empty, devolvemos NULL para que el frontend caiga al email.
      nullif(
        trim(
          coalesce(u.raw_user_meta_data->>'first_name', '') ||
          ' ' ||
          coalesce(u.raw_user_meta_data->>'last_name', '')
        ),
        ''
      ) AS author_name,
      n.is_pinned
    FROM public.superadmin_clinic_notes n
    LEFT JOIN auth.users u ON u.id = n.created_by
    WHERE n.org_id = p_org_id
    ORDER BY n.is_pinned DESC, n.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.superadmin_list_clinic_notes(uuid) IS
  'Lista notas comerciales de una clínica con email + nombre del autor + flag is_pinned. Orden: pineadas primero, luego created_at desc. Requiere is_platform_admin().';

REVOKE ALL ON FUNCTION public.superadmin_list_clinic_notes(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.superadmin_list_clinic_notes(uuid) TO authenticated;

-- ===========================================================================
-- E) RPC superadmin_tutor_hub_detail
-- ===========================================================================
-- Drill-down de un tutor del Hub. Solo orgs is_personal=true.
-- Tutor: el organization_member admin más antiguo de la org personal.
-- Si no hay miembro (invariante rota), devolvemos tutor=null sin raise.
--
-- Notas sobre las métricas de activity:
--   - appointments_count: filtra por org_id de la org personal. En la práctica
--     es siempre 0 hoy (las orgs personales no agendan citas en sí mismas).
--     Cuando se construya el bridge tutor-clinica, este conteo refleje la
--     actividad real. La estructura JSON queda lista.
--   - shared_exams_count: idem — depende de cuándo el bridge enlace exámenes
--     compartidos al tutor.
--   - last_portal_visit: usamos auth.users.last_sign_in_at del tutor como proxy.
CREATE OR REPLACE FUNCTION public.superadmin_tutor_hub_detail(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_record       record;
  v_tutor_record     record;
  v_pets_json        jsonb;
  v_appts_count      int;
  v_shared_exams     int;
  v_last_visit       timestamptz;
  v_tutor_json       jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden: caller is not a platform admin'
      USING errcode = '42501';
  END IF;

  -- 1) Verificar org existe AND is_personal=true
  SELECT id, created_at, coalesce(is_personal, false) AS is_personal
    INTO v_org_record
  FROM public.organizations
  WHERE id = p_org_id;

  IF v_org_record.id IS NULL THEN
    RAISE EXCEPTION 'org_not_found' USING errcode = 'P0002';
  END IF;

  IF v_org_record.is_personal = false THEN
    RAISE EXCEPTION 'not_personal_org' USING errcode = '22023';
  END IF;

  -- 2) Tutor: organization_member admin más antiguo (suele ser el único)
  SELECT
    om.user_id,
    om.first_name,
    om.last_name,
    u.email::text   AS email,
    u.last_sign_in_at,
    u.created_at    AS user_created_at
  INTO v_tutor_record
  FROM public.organization_members om
  LEFT JOIN auth.users u ON u.id = om.user_id
  WHERE om.org_id = p_org_id
    AND om.active = true
    AND om.role = 'admin'
  ORDER BY om.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_tutor_record.user_id IS NULL THEN
    -- Invariante rota: org personal sin admin. No raise; devolvemos null
    -- para que el panel pueda mostrar el caso y Pablo investigue.
    v_tutor_json := 'null'::jsonb;
    v_last_visit := NULL;
  ELSE
    -- Preferimos first_name del organization_member (lo que escribió el tutor
    -- al crear su org); si está vacío, caemos a raw_user_meta_data del auth.user.
    v_tutor_json := jsonb_build_object(
      'user_id',         v_tutor_record.user_id,
      'email',           v_tutor_record.email,
      'first_name',      nullif(trim(coalesce(v_tutor_record.first_name, '')), ''),
      'last_name',       nullif(trim(coalesce(v_tutor_record.last_name, '')), ''),
      'last_sign_in_at', v_tutor_record.last_sign_in_at,
      'created_at',      v_tutor_record.user_created_at
    );
    v_last_visit := v_tutor_record.last_sign_in_at;
  END IF;

  -- 3) Pets: filtrar por org_id (las mascotas del tutor en su org personal)
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id',         p.id,
      'name',       p.name,
      'species',    p.species,
      'size',       p.size,
      'birthday',   p.birthdate,
      'created_at', p.created_at
    )
    ORDER BY p.created_at DESC
  ), '[]'::jsonb)
  INTO v_pets_json
  FROM public.pets p
  WHERE p.org_id = p_org_id
    AND coalesce(p.active, true) = true;

  -- 4) Activity counters
  SELECT count(*)::int INTO v_appts_count
  FROM public.appointments a
  WHERE a.org_id = p_org_id;

  SELECT count(*)::int INTO v_shared_exams
  FROM public.clinical_record_exams e
  WHERE e.org_id = p_org_id
    AND e.shared_with_tutor_at IS NOT NULL;

  -- 5) Construir JSON de salida
  RETURN jsonb_build_object(
    'org', jsonb_build_object(
      'id',          v_org_record.id,
      'created_at',  v_org_record.created_at,
      'is_personal', true
    ),
    'tutor', v_tutor_json,
    'pets',  v_pets_json,
    'activity', jsonb_build_object(
      'appointments_count',  coalesce(v_appts_count, 0),
      'shared_exams_count',  coalesce(v_shared_exams, 0),
      'last_portal_visit',   v_last_visit
    )
  );
END;
$$;

COMMENT ON FUNCTION public.superadmin_tutor_hub_detail(uuid) IS
  'Drill-down de un tutor del Hub. Solo orgs is_personal=true (raise not_personal_org si no). Devuelve org + tutor (admin de la org personal) + pets + activity. tutor=null si la invariante de membresía está rota. Requiere is_platform_admin().';

REVOKE ALL ON FUNCTION public.superadmin_tutor_hub_detail(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.superadmin_tutor_hub_detail(uuid) TO authenticated;
