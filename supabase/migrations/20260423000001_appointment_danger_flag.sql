ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS is_dangerous boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.appointments.is_dangerous IS
  'Animal marcado como agresivo/peligroso para esta cita. Dispara alerta visual a todos los roles.';
