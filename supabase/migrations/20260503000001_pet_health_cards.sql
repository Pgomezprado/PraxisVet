-- Cartola Sanitaria QR (Pet Health Cards).
-- El tutor genera un código público con vencimiento de 30 días que actúa como
-- pasaporte sanitario para hoteles, daycares, paseadores y SAG. Al escanear el
-- QR se abre una página pública con vacunas, desparasitaciones, datos de la
-- mascota y la clínica que firma. La cartola puede revocarse en cualquier
-- momento.
--
-- Decisiones de diseño:
--   - Vencimiento por defecto 30 días (renovable creando una nueva).
--   - La lectura pública NO va por RLS (evita enumeración masiva de tokens).
--     En su lugar se expone una RPC `SECURITY DEFINER` que valida el token y
--     devuelve el JSON consolidado (mascota + organización + vacunas + des-
--     parasitaciones).
--   - El tutor (cliente con vínculo activo) sí puede listar/insertar/revocar
--     vía RLS estándar usando el helper existente `is_tutor_of_pet`.

-- ============================================
-- 1) Tabla pet_health_cards
-- ============================================
CREATE TABLE IF NOT EXISTS public.pet_health_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,

  CONSTRAINT pet_health_cards_token_length CHECK (char_length(token) >= 24),
  CONSTRAINT pet_health_cards_expires_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_pet_health_cards_token
  ON public.pet_health_cards (token);

CREATE INDEX IF NOT EXISTS idx_pet_health_cards_pet_active
  ON public.pet_health_cards (pet_id, revoked_at);

CREATE INDEX IF NOT EXISTS idx_pet_health_cards_client
  ON public.pet_health_cards (client_id);

CREATE INDEX IF NOT EXISTS idx_pet_health_cards_org
  ON public.pet_health_cards (org_id);

COMMENT ON TABLE public.pet_health_cards IS
  'Cartola sanitaria QR del tutor: link público con vacunas + desparasitaciones de una mascota. Vence a los 30 días o cuando el tutor la revoca.';

-- ============================================
-- 2) Trigger de validación de consistencia
-- ============================================
-- Garantiza que pet_id, client_id y org_id sean coherentes (la mascota
-- pertenece al cliente y a la organización indicada). También fija expires_at
-- por defecto si el caller no lo envía.
CREATE OR REPLACE FUNCTION public.pet_health_cards_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pet_org uuid;
  pet_client uuid;
BEGIN
  SELECT p.org_id, p.client_id
    INTO pet_org, pet_client
  FROM public.pets p
  WHERE p.id = NEW.pet_id;

  IF pet_org IS NULL THEN
    RAISE EXCEPTION 'pet_health_cards: la mascota % no existe', NEW.pet_id;
  END IF;

  IF NEW.org_id <> pet_org THEN
    RAISE EXCEPTION 'pet_health_cards: org_id no coincide con la mascota';
  END IF;

  IF NEW.client_id <> pet_client THEN
    RAISE EXCEPTION 'pet_health_cards: client_id no coincide con el dueño de la mascota';
  END IF;

  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + interval '30 days';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pet_health_cards_validate_trg ON public.pet_health_cards;
CREATE TRIGGER pet_health_cards_validate_trg
  BEFORE INSERT ON public.pet_health_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.pet_health_cards_validate();

-- ============================================
-- 3) RLS — solo el tutor de la mascota gestiona sus cartolas
-- ============================================
ALTER TABLE public.pet_health_cards ENABLE ROW LEVEL SECURITY;

-- SELECT: el tutor ve las cartolas de sus mascotas.
CREATE POLICY "pet_health_cards_tutor_read" ON public.pet_health_cards
  FOR SELECT TO authenticated
  USING (public.is_tutor_of_pet(pet_id));

-- INSERT: el tutor genera cartolas para sus mascotas.
CREATE POLICY "pet_health_cards_tutor_insert" ON public.pet_health_cards
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tutor_of_pet(pet_id));

-- UPDATE: el tutor solo puede revocar (set revoked_at) sus propias cartolas.
-- La lógica de "solo revocar" se aplica en el server action; RLS limita el
-- universo a sus mascotas.
CREATE POLICY "pet_health_cards_tutor_update" ON public.pet_health_cards
  FOR UPDATE TO authenticated
  USING (public.is_tutor_of_pet(pet_id))
  WITH CHECK (public.is_tutor_of_pet(pet_id));

-- Staff de la organización puede leer (debug, soporte futuro).
CREATE POLICY "pet_health_cards_staff_read" ON public.pet_health_cards
  FOR SELECT TO authenticated
  USING (org_id = public.get_user_org_id());

-- ============================================
-- 4) RPC pública (SECURITY DEFINER) para la vista del QR
-- ============================================
-- Devuelve un JSON con todo lo necesario para renderizar la cartola pública.
-- - Si no existe token → { found: false }
-- - Si está revocada → { found: true, status: 'revoked', revoked_at }
-- - Si está expirada → { found: true, status: 'expired', expires_at }
-- - Si está vigente → { found: true, status: 'active', card, pet, organization, tutor, vaccinations[], dewormings[] }
--
-- Marcada STABLE para que pueda llamarse en SELECT, pero NO incrementa el
-- contador (eso va en `record_health_card_view`, marcada VOLATILE).
CREATE OR REPLACE FUNCTION public.get_health_card_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  card_row record;
  pet_row record;
  org_row record;
  tutor_row record;
  vaccs jsonb;
  deworms jsonb;
  status_text text;
BEGIN
  IF p_token IS NULL OR char_length(p_token) < 24 THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT *
    INTO card_row
  FROM public.pet_health_cards
  WHERE token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  IF card_row.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'found', true,
      'status', 'revoked',
      'revoked_at', card_row.revoked_at
    );
  END IF;

  IF card_row.expires_at <= now() THEN
    RETURN jsonb_build_object(
      'found', true,
      'status', 'expired',
      'expires_at', card_row.expires_at
    );
  END IF;

  status_text := 'active';

  SELECT id, name, species, breed, sex, birthdate, microchip, photo_url, color
    INTO pet_row
  FROM public.pets
  WHERE id = card_row.pet_id;

  SELECT id, name, slug, logo_url, phone, address
    INTO org_row
  FROM public.organizations
  WHERE id = card_row.org_id;

  SELECT first_name, last_name
    INTO tutor_row
  FROM public.clients
  WHERE id = card_row.client_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', v.id,
    'vaccine_name', v.vaccine_name,
    'date_administered', v.date_administered,
    'next_due_date', v.next_due_date,
    'lot_number', v.lot_number
  ) ORDER BY v.date_administered DESC), '[]'::jsonb)
    INTO vaccs
  FROM public.vaccinations v
  WHERE v.pet_id = card_row.pet_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', d.id,
    'type', d.type,
    'date_administered', d.date_administered,
    'next_due_date', d.next_due_date,
    'product', d.product
  ) ORDER BY d.date_administered DESC), '[]'::jsonb)
    INTO deworms
  FROM public.dewormings d
  WHERE d.pet_id = card_row.pet_id;

  RETURN jsonb_build_object(
    'found', true,
    'status', status_text,
    'card', jsonb_build_object(
      'id', card_row.id,
      'created_at', card_row.created_at,
      'expires_at', card_row.expires_at,
      'view_count', card_row.view_count,
      'last_viewed_at', card_row.last_viewed_at
    ),
    'pet', jsonb_build_object(
      'id', pet_row.id,
      'name', pet_row.name,
      'species', pet_row.species,
      'breed', pet_row.breed,
      'sex', pet_row.sex,
      'birthdate', pet_row.birthdate,
      'microchip', pet_row.microchip,
      'photo_url', pet_row.photo_url,
      'color', pet_row.color
    ),
    'organization', jsonb_build_object(
      'id', org_row.id,
      'name', org_row.name,
      'slug', org_row.slug,
      'logo_url', org_row.logo_url,
      'phone', org_row.phone,
      'address', org_row.address
    ),
    'tutor', jsonb_build_object(
      'first_name', tutor_row.first_name,
      'last_name', tutor_row.last_name
    ),
    'vaccinations', vaccs,
    'dewormings', deworms
  );
END;
$$;

COMMENT ON FUNCTION public.get_health_card_by_token(text) IS
  'Devuelve el JSON consolidado de una cartola sanitaria por token. SECURITY DEFINER: bypasea RLS pero filtra por token (no enumeración). No incrementa el contador.';

-- ============================================
-- 5) RPC para registrar visualización (incrementa view_count)
-- ============================================
CREATE OR REPLACE FUNCTION public.record_health_card_view(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
BEGIN
  UPDATE public.pet_health_cards
     SET view_count = view_count + 1,
         last_viewed_at = now()
   WHERE token = p_token
     AND revoked_at IS NULL
     AND expires_at > now();
END;
$$;

COMMENT ON FUNCTION public.record_health_card_view(text) IS
  'Incrementa el contador de vistas de una cartola activa. No-op si está revocada o expirada.';

-- ============================================
-- 6) Permisos GRANT — exponer RPCs al rol anon (lectura pública del QR)
-- ============================================
GRANT EXECUTE ON FUNCTION public.get_health_card_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_health_card_view(text) TO anon, authenticated;
