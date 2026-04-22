-- ============================================
-- Sprint 4 · Fix timezone en member_schedule_blocks
-- ============================================
-- La tabla original usaba timestamptz y la UI concatenaba T00:00:00 local,
-- lo que se desplazaba 3-4h en Vercel (UTC) vs Chile (UTC-3/-4). Como la
-- tabla está vacía tras el deploy de Sprint 4, migramos a semántica de día
-- completo usando date.
-- ============================================

BEGIN;

-- Rename + retype: start_at/end_at -> start_date/end_date.
-- Tabla vacía, no requiere backfill.
ALTER TABLE public.member_schedule_blocks
  ALTER COLUMN start_at TYPE date USING start_at::date,
  ALTER COLUMN end_at   TYPE date USING end_at::date;

ALTER TABLE public.member_schedule_blocks
  RENAME COLUMN start_at TO start_date;
ALTER TABLE public.member_schedule_blocks
  RENAME COLUMN end_at TO end_date;

-- El CHECK original (start_at < end_at) queda huérfano tras rename; lo
-- reemplazamos con la semántica inclusiva de día completo.
ALTER TABLE public.member_schedule_blocks
  DROP CONSTRAINT IF EXISTS member_schedule_blocks_check;
ALTER TABLE public.member_schedule_blocks
  ADD CONSTRAINT block_date_order CHECK (start_date <= end_date);

DROP INDEX IF EXISTS idx_schedule_blocks_member_range;
CREATE INDEX idx_schedule_blocks_member_dates
  ON public.member_schedule_blocks (member_id, start_date, end_date);

COMMIT;
