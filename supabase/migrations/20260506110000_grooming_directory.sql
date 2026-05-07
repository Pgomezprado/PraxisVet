-- Bloque 3c — Directorio público de peluquerías PraxisVet.
--
-- Para que el hub `/mascotas/belleza` muestre todas las clínicas de
-- PraxisVet que ofrecen peluquería, necesitamos exponer datos *públicos*
-- de la organización (nombre, slug, logo, dirección, teléfono) sin abrir
-- toda la tabla `organizations` a cualquier authenticated.
--
-- Solución: RPC `get_grooming_clinic_directory()` con SECURITY DEFINER
-- que devuelve solo columnas públicas y solo orgs donde:
--   - active = true
--   - is_personal = false (no exponer espacios personales del hub)
--   - tiene al menos un miembro activo capaz de grooming
--     (role='groomer' OR member_capabilities.can_groom=true)
--
-- Decisión CoFounder (2026-05-06): este endpoint roza una de las "3 cosas
-- innegociables hasta cerrar 5 fundadoras" (no comparador de clínicas).
-- Como esta rama NO se sube a producción, lo construimos. Antes de
-- publicar al mundo, pedir consentimiento a Paws & Hair y Reino Salvaje.

CREATE OR REPLACE FUNCTION public.get_grooming_clinic_directory()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  address text,
  phone text,
  groomer_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH grooming_orgs AS (
    -- Miembros con role='groomer' o con capability 'can_groom' (extra capacity).
    SELECT om.org_id, count(DISTINCT om.id)::bigint AS groomer_count
    FROM public.organization_members om
    LEFT JOIN public.member_capabilities mc
      ON mc.member_id = om.id AND mc.capability = 'can_groom'
    WHERE om.active = true
      AND (
        om.role = 'groomer'
        OR mc.member_id IS NOT NULL
      )
    GROUP BY om.org_id
  )
  SELECT
    o.id,
    o.name,
    o.slug,
    o.logo_url,
    o.address,
    o.phone,
    g.groomer_count
  FROM public.organizations o
  JOIN grooming_orgs g ON g.org_id = o.id
  WHERE o.active = true
    AND o.is_personal = false
  ORDER BY o.name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_grooming_clinic_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_grooming_clinic_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_grooming_clinic_directory() TO anon;

COMMENT ON FUNCTION public.get_grooming_clinic_directory() IS
  'Directorio público de clínicas PraxisVet con peluquería. Solo expone columnas públicas (nombre, slug, logo, dirección, teléfono). Excluye orgs personales del hub.';
