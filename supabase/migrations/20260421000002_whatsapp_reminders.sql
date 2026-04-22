-- Recordatorios por WhatsApp: campos de normalización, opt-in por cliente y
-- opt-in por clínica. El número `phone` del cliente sigue siendo el input del
-- usuario (texto libre); `phone_e164` lo mantiene un trigger normalizador.

-- 1) Función de normalización: de un phone chileno a formato E.164 (+56XXXXXXXXX).
--    Acepta variaciones: "+56 9 1234 5678", "56912345678", "912345678", "9 1234 5678".
--    Retorna NULL si el número no puede normalizarse (no-chileno o inválido).
CREATE OR REPLACE FUNCTION public.normalize_cl_phone(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
BEGIN
  IF input IS NULL OR length(trim(input)) = 0 THEN
    RETURN NULL;
  END IF;

  -- Conserva solo dígitos.
  digits := regexp_replace(input, '[^0-9]', '', 'g');

  -- Caso: ya tiene prefijo país (56) + 9 (móvil Chile) + 8 dígitos = 11 total.
  IF length(digits) = 11 AND substr(digits, 1, 3) = '569' THEN
    RETURN '+' || digits;
  END IF;

  -- Caso: sin prefijo país, empieza con 9 y tiene 9 dígitos totales (móvil).
  IF length(digits) = 9 AND substr(digits, 1, 1) = '9' THEN
    RETURN '+56' || digits;
  END IF;

  -- Cualquier otro formato se considera inválido para WhatsApp Chile.
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.normalize_cl_phone(text) IS
  'Normaliza un teléfono chileno a formato E.164 (+569XXXXXXXX). Retorna NULL si no es válido.';

-- 2) Columnas nuevas en clients.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_clients_phone_e164
  ON public.clients (org_id, phone_e164)
  WHERE phone_e164 IS NOT NULL;

-- 3) Trigger: mantener phone_e164 sincronizado con phone.
CREATE OR REPLACE FUNCTION public.sync_client_phone_e164()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.phone_e164 := public.normalize_cl_phone(NEW.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_sync_phone_e164 ON public.clients;
CREATE TRIGGER trg_clients_sync_phone_e164
  BEFORE INSERT OR UPDATE OF phone ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_client_phone_e164();

-- 4) Backfill de filas existentes.
UPDATE public.clients
   SET phone_e164 = public.normalize_cl_phone(phone)
 WHERE phone IS NOT NULL
   AND phone_e164 IS NULL;

-- 5) Setting a nivel clínica: opt-in explícito para enviar recordatorios WhatsApp.
--    Default false para no enviar nada sin consentimiento del admin.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS whatsapp_reminders_enabled boolean NOT NULL DEFAULT false;
