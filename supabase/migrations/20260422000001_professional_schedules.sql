-- ============================================
-- Sprint 4 · Feature 1: Agenda real
-- ============================================
-- Horarios de atención semanales por profesional + bloqueos puntuales
-- (vacaciones, licencia, curso). Usado por la validación de disponibilidad
-- en createAppointment/updateAppointment.
--
-- Escritura limitada a admins de la org. Lectura a todos los miembros
-- activos de la org (recep necesita ver horarios para agendar).
-- ============================================

BEGIN;

-- Horario semanal recurrente. Un profesional puede tener múltiples tramos
-- por día (ej: 09:00-13:00 y 15:00-19:00).
CREATE TABLE public.member_weekly_schedules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id    uuid NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  day_of_week  smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=domingo, 6=sábado
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (start_time < end_time)
);

CREATE INDEX idx_weekly_schedules_member_dow
  ON public.member_weekly_schedules (member_id, day_of_week);
CREATE INDEX idx_weekly_schedules_org
  ON public.member_weekly_schedules (org_id);

ALTER TABLE public.member_weekly_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_schedules_select"
  ON public.member_weekly_schedules
  FOR SELECT
  TO authenticated
  USING (org_id = public.get_user_org_id());

CREATE POLICY "weekly_schedules_insert"
  ON public.member_weekly_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

CREATE POLICY "weekly_schedules_update"
  ON public.member_weekly_schedules
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

CREATE POLICY "weekly_schedules_delete"
  ON public.member_weekly_schedules
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

-- Bloqueos puntuales (vacaciones, licencia, curso, día libre).
-- Rango timestamptz para permitir bloqueos parciales de día.
CREATE TABLE public.member_schedule_blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  start_at    timestamptz NOT NULL,
  end_at      timestamptz NOT NULL,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (start_at < end_at)
);

CREATE INDEX idx_schedule_blocks_member_range
  ON public.member_schedule_blocks (member_id, start_at, end_at);
CREATE INDEX idx_schedule_blocks_org
  ON public.member_schedule_blocks (org_id);

ALTER TABLE public.member_schedule_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_blocks_select"
  ON public.member_schedule_blocks
  FOR SELECT
  TO authenticated
  USING (org_id = public.get_user_org_id());

CREATE POLICY "schedule_blocks_insert"
  ON public.member_schedule_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

CREATE POLICY "schedule_blocks_update"
  ON public.member_schedule_blocks
  FOR UPDATE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']))
  WITH CHECK (public.user_has_role_in_org(org_id, ARRAY['admin']));

CREATE POLICY "schedule_blocks_delete"
  ON public.member_schedule_blocks
  FOR DELETE
  TO authenticated
  USING (public.user_has_role_in_org(org_id, ARRAY['admin']));

COMMIT;
