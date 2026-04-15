-- ============================================
-- Migration: Allow user_id promotion (NULL → uuid)
-- ============================================
-- El trigger anterior bloqueaba CUALQUIER cambio de user_id en
-- organization_members. Esto impide el flujo de invitaciones, donde un
-- "profile-only member" (user_id NULL) se promueve a usuario con login.
--
-- Nueva regla: user_id sólo puede cambiar de NULL a un uuid (promoción).
-- Prohibido: uuid → otro uuid (swap), uuid → NULL (degradación).

CREATE OR REPLACE FUNCTION public.prevent_org_member_key_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
    RAISE EXCEPTION 'org_id no puede modificarse en organization_members';
  END IF;

  -- Permitir promoción: NULL → uuid (aceptación de invitación)
  -- Prohibir: swap o degradación
  IF OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id ya está asignado y no puede modificarse';
  END IF;

  RETURN NEW;
END;
$$;
