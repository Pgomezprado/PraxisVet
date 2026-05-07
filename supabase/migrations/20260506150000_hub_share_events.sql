-- Bloque 5 — Métricas de viralidad del hub.
--
-- Cada vez que un tutor comparte PraxisVet (con su vet o con otro dueño)
-- registramos el evento. La tesis bottom-up depende de saber si los loops
-- virales realmente funcionan.

CREATE TABLE IF NOT EXISTS public.hub_share_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind       text NOT NULL CHECK (
               kind IN ('share_with_vet', 'invite_tutor')
             ),
  channel    text CHECK (
               channel IS NULL
               OR channel IN ('whatsapp', 'copy', 'native_share', 'email')
             ),
  context    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_share_events_kind_created
  ON public.hub_share_events (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hub_share_events_user
  ON public.hub_share_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.hub_share_events ENABLE ROW LEVEL SECURITY;
-- Sin policies: la escritura va por la RPC. Lectura solo vía service_role
-- (analytics dashboard a futuro).

-- ===========================================================================
-- RPC: record_hub_share_event
-- ---------------------------------------------------------------------------
-- Sin restricción de duplicados — un mismo user puede compartir varias veces
-- y eso es la métrica que queremos medir.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.record_hub_share_event(
  p_kind    text,
  p_channel text DEFAULT NULL,
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id uuid;
BEGIN
  IF p_kind NOT IN ('share_with_vet', 'invite_tutor') THEN
    RAISE EXCEPTION 'kind inválido: %', p_kind;
  END IF;

  INSERT INTO public.hub_share_events (user_id, kind, channel, context)
  VALUES (v_user_id, p_kind, p_channel, coalesce(p_context, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_hub_share_event(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_hub_share_event(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_hub_share_event(text, text, jsonb) TO anon;

COMMENT ON TABLE public.hub_share_events IS
  'Eventos de share del hub /mascotas. Mide la efectividad del loop bottom-up (tutor → vet, tutor → tutor). RLS cerrada — escritura por RPC, lectura solo service_role.';
