-- ============================================
-- Hardening: SET search_path en RPCs SECURITY DEFINER
-- ============================================
-- Defensa en profundidad: con search_path fijo, las funciones no pueden ser
-- engañadas si un atacante crea un schema homónimo con tablas/funciones
-- impostoras. Best practice estándar para SECURITY DEFINER.

ALTER FUNCTION public.pet_health_cards_validate()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.get_health_card_by_token(text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.record_health_card_view(text)
  SET search_path = public, pg_temp;
