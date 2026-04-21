-- Índices de apoyo para el panel de Analytics del admin.
-- Todas las queries filtran por org_id y agregan por paid_at / date.

CREATE INDEX IF NOT EXISTS idx_invoices_paid_at
  ON public.invoices (org_id, paid_at)
  WHERE status = 'paid';

CREATE INDEX IF NOT EXISTS idx_appointments_date_status
  ON public.appointments (org_id, date, status);

CREATE INDEX IF NOT EXISTS idx_appointments_assigned_to
  ON public.appointments (org_id, assigned_to, date);
