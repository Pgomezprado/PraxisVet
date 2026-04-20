-- ============================================
-- Detección de pacientes duplicados
-- ============================================
-- Feedback recepcionista 2026-04-19: "estoy ingresando a un paciente y
-- ya está ingresado.. se puede como que salga una alerta que ya está
-- ingresado?".
--
-- Defensa en capa DB: índice único parcial sobre (org_id, client_id,
-- lower(name)) restringido a pets activos. Esto evita que cualquier
-- camino (UI, API directa, import bulk) cree dos mascotas con el
-- mismo nombre para el mismo tutor de la misma clínica.
--
-- Notas:
--   - Comparación case-insensitive (lower) y trim implícito en el
--     server action: "Luna" == "luna" == " Luna ".
--   - WHERE active = true permite re-crear una mascota con nombre
--     reutilizado si la anterior fue desactivada.
--   - Si esta migración encuentra duplicados existentes, se cancelará.
--     En ese caso hay que limpiar manualmente antes de re-aplicar.
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS pets_unique_per_client
  ON public.pets (org_id, client_id, lower(name))
  WHERE active = true;
