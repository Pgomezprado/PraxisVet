-- Log de notificaciones salientes (WhatsApp, email, SMS).
-- Uso: auditoría, debug de fallos de delivery, evidencia de consentimiento (Ley 19.628).

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,

  channel text NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms')),
  template text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),

  provider_message_id text,
  error_code text,
  error_message text,
  payload jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_org
  ON public.notification_logs (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_appointment
  ON public.notification_logs (appointment_id)
  WHERE appointment_id IS NOT NULL;

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins de la org pueden leer sus propios logs.
CREATE POLICY "notification_logs_admin_read" ON public.notification_logs
  FOR SELECT TO authenticated
  USING (
    public.user_has_role_in_org(org_id, ARRAY['admin']::text[])
  );

-- Nadie más puede escribir desde la app: los logs los escribe el cron con service_role.
-- Sin política de INSERT/UPDATE/DELETE para `authenticated` → RLS bloquea.
