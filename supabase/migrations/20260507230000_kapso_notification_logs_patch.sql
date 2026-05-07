-- Patch para notification_logs: la migración 20260506140000_kapso_whatsapp_v2.sql
-- usó CREATE TABLE IF NOT EXISTS, pero la tabla ya existía desde WhatsApp v1
-- (Twilio) con schema más viejo. Las columnas nuevas (provider, direction,
-- phone_e164) nunca se agregaron y rompen los inserts del dispatcher Kapso.
--
-- Cambios:
--   - ADD COLUMN provider text DEFAULT 'kapso' + check
--   - ADD COLUMN direction text DEFAULT 'outbound' + check
--   - ADD COLUMN phone_e164 text
--   - Backfill de filas existentes con provider='internal' (origen desconocido)
--     para no romper la check constraint si ya hay datos del v1.

ALTER TABLE public.notification_logs
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS direction text,
  ADD COLUMN IF NOT EXISTS phone_e164 text;

-- Backfill: registros existentes (si los hay) son del v1 con Twilio o internos.
UPDATE public.notification_logs
   SET provider = COALESCE(provider, 'internal'),
       direction = COALESCE(direction, 'outbound')
 WHERE provider IS NULL OR direction IS NULL;

-- Defaults + NOT NULL + checks (idempotentes).
ALTER TABLE public.notification_logs
  ALTER COLUMN provider SET DEFAULT 'kapso',
  ALTER COLUMN provider SET NOT NULL,
  ALTER COLUMN direction SET DEFAULT 'outbound',
  ALTER COLUMN direction SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notification_logs_provider_check'
      AND conrelid = 'public.notification_logs'::regclass
  ) THEN
    ALTER TABLE public.notification_logs
      ADD CONSTRAINT notification_logs_provider_check
      CHECK (provider IN ('kapso', 'twilio', 'meta', 'resend', 'internal'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notification_logs_direction_check'
      AND conrelid = 'public.notification_logs'::regclass
  ) THEN
    ALTER TABLE public.notification_logs
      ADD CONSTRAINT notification_logs_direction_check
      CHECK (direction IN ('outbound', 'inbound'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notification_logs_provider_message
  ON public.notification_logs (provider_message_id)
  WHERE provider_message_id IS NOT NULL;
