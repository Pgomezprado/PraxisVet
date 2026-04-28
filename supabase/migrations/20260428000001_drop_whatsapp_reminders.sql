-- Limpieza completa de la feature WhatsApp Recordatorios.
-- Motivo: la feature no terminó de probarse en producción y el equipo decidió
-- removerla. Se elimina toda la superficie en DB para que no queden columnas
-- huérfanas. Si en el futuro se reintegra, se puede volver a aplicar las
-- migraciones 20260421000002, 20260421000003, 20260427000001.

-- ============================================
-- 1) Drop trigger + función de normalización de phone
-- ============================================
DROP TRIGGER IF EXISTS trg_clients_sync_phone_e164 ON public.clients;
DROP FUNCTION IF EXISTS public.sync_client_phone_e164();
DROP FUNCTION IF EXISTS public.normalize_cl_phone(text);

-- ============================================
-- 2) Drop índices sobre phone_e164
-- ============================================
DROP INDEX IF EXISTS public.idx_clients_phone_e164;
DROP INDEX IF EXISTS public.idx_clients_phone_e164_lookup;

-- ============================================
-- 3) Drop columnas de clients
-- ============================================
ALTER TABLE public.clients
  DROP COLUMN IF EXISTS phone_e164,
  DROP COLUMN IF EXISTS whatsapp_opt_in,
  DROP COLUMN IF EXISTS whatsapp_opt_in_at,
  DROP COLUMN IF EXISTS whatsapp_opt_in_source;

-- ============================================
-- 4) Drop columnas de organizations
-- ============================================
ALTER TABLE public.organizations
  DROP COLUMN IF EXISTS whatsapp_reminders_enabled,
  DROP COLUMN IF EXISTS whatsapp_appt_reminder_24h_enabled,
  DROP COLUMN IF EXISTS whatsapp_appt_confirmation_enabled;

-- ============================================
-- 5) Drop tabla notification_logs
-- ============================================
DROP TABLE IF EXISTS public.notification_logs;
