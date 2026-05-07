-- Bloque 4 — Lista de espera del hub.
--
-- Para las 4 secciones que aún no tienen producto (mall, viajes, proteccion,
-- comunidad), el dueño puede dejar su email para que le avisemos cuando
-- lance. Esto valida demanda mientras cerramos partners.
--
-- Decisión: una sola tabla con `section` enum-light (CHECK constraint).
-- El upsert se hace vía RPC con SECURITY DEFINER para que el form sea
-- accesible sin exponer la tabla a los clients.

CREATE TABLE IF NOT EXISTS public.hub_waitlist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email       text NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone       text,
  section     text NOT NULL CHECK (
                section IN ('mall', 'viajes', 'proteccion', 'comunidad')
              ),
  notes       text,
  pet_species text CHECK (
                pet_species IS NULL
                OR pet_species IN ('canino', 'felino', 'exotico')
              ),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, section)
);

CREATE INDEX IF NOT EXISTS idx_hub_waitlist_section
  ON public.hub_waitlist (section, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hub_waitlist_user
  ON public.hub_waitlist (user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.hub_waitlist ENABLE ROW LEVEL SECURITY;

-- No exponemos la tabla. Toda escritura va por el RPC. No hay policies.
-- Los inserts directos desde el client serán rechazados.

-- ===========================================================================
-- RPC: join_hub_waitlist
-- ---------------------------------------------------------------------------
-- Idempotente: si el (email, section) ya existe, actualiza phone/notes/
-- pet_species. Devuelve { id, was_new }.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.join_hub_waitlist(
  p_section     text,
  p_email       text,
  p_phone       text DEFAULT NULL,
  p_notes       text DEFAULT NULL,
  p_pet_species text DEFAULT NULL
)
RETURNS TABLE (id uuid, was_new boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email   text := lower(trim(p_email));
  v_phone   text := nullif(trim(p_phone), '');
  v_notes   text := nullif(trim(p_notes), '');
  v_species text := nullif(trim(p_pet_species), '');
  v_existing_id uuid;
BEGIN
  IF p_section NOT IN ('mall', 'viajes', 'proteccion', 'comunidad') THEN
    RAISE EXCEPTION 'Sección inválida: %', p_section;
  END IF;
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email es obligatorio';
  END IF;
  IF v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Email inválido';
  END IF;

  -- Si ya existe el (email, section), actualizamos.
  SELECT w.id INTO v_existing_id
  FROM public.hub_waitlist w
  WHERE w.email = v_email AND w.section = p_section;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.hub_waitlist
    SET phone       = coalesce(v_phone, phone),
        notes       = coalesce(v_notes, notes),
        pet_species = coalesce(v_species, pet_species),
        user_id     = coalesce(user_id, v_user_id),
        updated_at  = now()
    WHERE id = v_existing_id;

    id := v_existing_id;
    was_new := false;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.hub_waitlist (
    user_id, email, phone, section, notes, pet_species
  )
  VALUES (
    v_user_id, v_email, v_phone, p_section, v_notes, v_species
  )
  RETURNING hub_waitlist.id INTO v_existing_id;

  id := v_existing_id;
  was_new := true;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.join_hub_waitlist(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_hub_waitlist(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_hub_waitlist(text, text, text, text, text) TO anon;

COMMENT ON TABLE public.hub_waitlist IS
  'Captura de demanda para las secciones Mall/Viajes/Protección/Comunidad del hub /mascotas. RLS cerrada — toda escritura vía RPC join_hub_waitlist.';
