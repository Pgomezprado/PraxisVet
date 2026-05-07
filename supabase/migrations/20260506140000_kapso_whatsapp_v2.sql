-- WhatsApp v2 — provider Kapso (reemplaza WhatsApp v1 con Twilio que se removió en 20260428000001).
-- Reaplica el schema previo (phone_e164 + opt-in + notification_logs) y agrega columnas
-- provider-agnostic para soportar Kapso (y futuros proveedores) en la misma tabla.

-- ============================================
-- 1) Normalización de teléfono CL → E.164
-- ============================================
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
  digits := regexp_replace(input, '[^0-9]', '', 'g');
  IF length(digits) = 11 AND substr(digits, 1, 3) = '569' THEN
    RETURN '+' || digits;
  END IF;
  IF length(digits) = 9 AND substr(digits, 1, 1) = '9' THEN
    RETURN '+56' || digits;
  END IF;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.normalize_cl_phone(text) IS
  'Normaliza un teléfono chileno a formato E.164 (+569XXXXXXXX). Retorna NULL si no es válido.';

-- ============================================
-- 2) Columnas en clients (E.164 + consentimiento Ley 19.628)
-- ============================================
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_source text
    CHECK (whatsapp_opt_in_source IN ('clinic_form','portal_self','verbal_recorded','imported'));

COMMENT ON COLUMN public.clients.whatsapp_opt_in IS
  'Consentimiento explícito del tutor para recibir WhatsApp. Default false.';
COMMENT ON COLUMN public.clients.whatsapp_opt_in_at IS
  'Timestamp en que el tutor aceptó recibir notificaciones por WhatsApp (Ley 19.628).';
COMMENT ON COLUMN public.clients.whatsapp_opt_in_source IS
  'Fuente del consentimiento: clinic_form (recepción), portal_self, verbal_recorded, imported (backfill).';

CREATE INDEX IF NOT EXISTS idx_clients_phone_e164
  ON public.clients (org_id, phone_e164)
  WHERE phone_e164 IS NOT NULL;

-- Índice puro sobre phone_e164 para lookup desde webhook inbound (no conoce org_id).
CREATE INDEX IF NOT EXISTS idx_clients_phone_e164_lookup
  ON public.clients (phone_e164)
  WHERE phone_e164 IS NOT NULL;

-- Trigger: mantener phone_e164 sincronizado con phone.
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

-- Backfill: filas existentes obtienen su phone_e164 normalizado.
UPDATE public.clients
   SET phone_e164 = public.normalize_cl_phone(phone)
 WHERE phone IS NOT NULL
   AND phone_e164 IS NULL;

-- ============================================
-- 3) Settings de WhatsApp por organización
-- ============================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS whatsapp_reminders_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_appt_confirmation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_appt_reminder_24h_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_vaccine_reminder_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.organizations.whatsapp_reminders_enabled IS
  'Master switch de WhatsApp para esta organización. Si está en false, ningún mensaje sale.';
COMMENT ON COLUMN public.organizations.whatsapp_appt_confirmation_enabled IS
  'Sub-toggle: enviar confirmación inmediata al agendar/confirmar cita.';
COMMENT ON COLUMN public.organizations.whatsapp_appt_reminder_24h_enabled IS
  'Sub-toggle: enviar recordatorio 24h antes de la cita.';
COMMENT ON COLUMN public.organizations.whatsapp_vaccine_reminder_enabled IS
  'Sub-toggle: enviar recordatorio cuando una vacuna esté próxima a vencer.';

-- ============================================
-- 4) Tabla notification_logs (provider-agnostic)
-- ============================================
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,

  channel text NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms')),
  provider text NOT NULL DEFAULT 'kapso'
    CHECK (provider IN ('kapso', 'twilio', 'meta', 'resend', 'internal')),
  template text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
  direction text NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('outbound', 'inbound')),

  -- Identificadores externos (Kapso devuelve wamid de Meta).
  provider_message_id text,
  -- Teléfono en E.164 — útil cuando el cliente fue eliminado y queremos auditar.
  phone_e164 text,

  -- Diagnóstico de fallos.
  error_code text,
  error_message text,
  -- Payload completo del request o del webhook event (para debug).
  payload jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_org
  ON public.notification_logs (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_appointment
  ON public.notification_logs (appointment_id)
  WHERE appointment_id IS NOT NULL;

-- Lookup rápido por wamid cuando llega un webhook de status update.
CREATE INDEX IF NOT EXISTS idx_notification_logs_provider_message
  ON public.notification_logs (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins de la org pueden leer sus propios logs.
DROP POLICY IF EXISTS "notification_logs_admin_read" ON public.notification_logs;
CREATE POLICY "notification_logs_admin_read" ON public.notification_logs
  FOR SELECT TO authenticated
  USING (
    public.user_has_role_in_org(org_id, ARRAY['admin']::text[])
  );

-- Sin políticas de INSERT/UPDATE/DELETE para `authenticated`:
-- los logs los escribe el server con service_role (Server Actions / webhook / cron).

COMMENT ON TABLE public.notification_logs IS
  'Log inmutable de notificaciones (WhatsApp / email / SMS). Ley 19.628: evidencia de consentimiento y delivery.';
