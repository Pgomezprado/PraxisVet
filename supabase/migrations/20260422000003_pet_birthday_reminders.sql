-- ============================================
-- Sprint 4 · Feature 3: Recordatorios de cumpleaños de mascotas
-- ============================================
-- Agrega flag por organización para apagar los cumpleaños, y tabla de log
-- para garantizar idempotencia del cron (no enviar dos veces el mismo día).
-- ============================================

BEGIN;

-- Flag opt-out por clínica (default on).
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS pet_birthday_reminders_enabled boolean NOT NULL DEFAULT true;

-- Log de envíos para idempotencia. PK compuesta evita segundo insert.
CREATE TABLE IF NOT EXISTS public.sent_birthday_log (
  pet_id     uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  sent_on    date NOT NULL,
  org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pet_id, sent_on)
);

CREATE INDEX idx_sent_birthday_log_org
  ON public.sent_birthday_log (org_id, sent_on);

ALTER TABLE public.sent_birthday_log ENABLE ROW LEVEL SECURITY;

-- Solo admins leen el log (útil para debug/auditoría). Inserts los hace
-- el cron con service_role, no aplica RLS a service_role.
CREATE POLICY "sent_birthday_log_select"
  ON public.sent_birthday_log
  FOR SELECT
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

COMMIT;
