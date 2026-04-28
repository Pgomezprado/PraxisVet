-- Sprint WhatsApp Recordatorios v1
-- 1) Consentimiento explícito de tutor (Ley 19.628 Chile): exige timestamp + fuente.
-- 2) Settings granulares por tipo de notificación a nivel organización.
-- 3) Índice puro sobre phone_e164 para lookup en webhook inbound (STOP/BAJA).

-- ============================================
-- 1) Consentimiento explícito en clients
-- ============================================
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_source text
    CHECK (whatsapp_opt_in_source IN ('clinic_form','portal_self','verbal_recorded','imported'));

-- Backfill: clientes existentes con opt_in=true se marcan como 'imported'
-- para no perder el consentimiento implícito (default true previo).
UPDATE public.clients
   SET whatsapp_opt_in_at = COALESCE(whatsapp_opt_in_at, now()),
       whatsapp_opt_in_source = COALESCE(whatsapp_opt_in_source, 'imported')
 WHERE whatsapp_opt_in = true
   AND whatsapp_opt_in_at IS NULL;

-- A partir de ahora el default es false: futuros clientes deben marcar el
-- checkbox de consentimiento explícito en el formulario.
ALTER TABLE public.clients
  ALTER COLUMN whatsapp_opt_in SET DEFAULT false;

COMMENT ON COLUMN public.clients.whatsapp_opt_in_at IS
  'Timestamp en que el tutor aceptó recibir notificaciones por WhatsApp (Ley 19.628).';
COMMENT ON COLUMN public.clients.whatsapp_opt_in_source IS
  'Fuente del consentimiento: clinic_form (recepción), portal_self, verbal_recorded, imported (backfill).';

-- ============================================
-- 2) Settings granulares en organizations
-- ============================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS whatsapp_appt_reminder_24h_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_appt_confirmation_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.organizations.whatsapp_appt_reminder_24h_enabled IS
  'Sub-toggle: enviar recordatorio 24h antes de la cita (requiere master switch).';
COMMENT ON COLUMN public.organizations.whatsapp_appt_confirmation_enabled IS
  'Sub-toggle: enviar confirmación inmediata al agendar/confirmar cita (requiere master switch).';

-- ============================================
-- 3) Índice puro para webhook lookup
-- ============================================
-- El índice existente es (org_id, phone_e164). El webhook inbound recibe sólo
-- el número y debe encontrar al cliente sin conocer su org → necesita índice
-- por phone_e164 puro.
CREATE INDEX IF NOT EXISTS idx_clients_phone_e164_lookup
  ON public.clients (phone_e164)
  WHERE phone_e164 IS NOT NULL;
