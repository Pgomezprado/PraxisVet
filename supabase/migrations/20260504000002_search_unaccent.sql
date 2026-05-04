-- Búsqueda insensible a acentos: usuarios que escriben "Maria" deben encontrar "María".
-- Estrategia:
--   1. Habilitar unaccent + pg_trgm.
--   2. Wrapper IMMUTABLE de unaccent para usar en columnas generadas e índices.
--   3. Columna generada *_search (lowercased + sin acentos) en clients, pets, products.
--   4. Índices GIN trigram sobre las columnas _search para que ilike '%x%' sea rápido.

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1);
$$;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS first_name_search text
    GENERATED ALWAYS AS (lower(public.immutable_unaccent(coalesce(first_name, '')))) STORED,
  ADD COLUMN IF NOT EXISTS last_name_search text
    GENERATED ALWAYS AS (lower(public.immutable_unaccent(coalesce(last_name, '')))) STORED;

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS name_search text
    GENERATED ALWAYS AS (lower(public.immutable_unaccent(coalesce(name, '')))) STORED;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS name_search text
    GENERATED ALWAYS AS (lower(public.immutable_unaccent(coalesce(name, '')))) STORED;

CREATE INDEX IF NOT EXISTS idx_clients_first_name_search_trgm
  ON public.clients USING gin (first_name_search gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_last_name_search_trgm
  ON public.clients USING gin (last_name_search gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pets_name_search_trgm
  ON public.pets USING gin (name_search gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_name_search_trgm
  ON public.products USING gin (name_search gin_trgm_ops);
