-- ============================================
-- Próxima consulta sugerida en la ficha clínica
-- ============================================
-- Feedback veterinario 2026-04-19: la vet quiere agendar (o al menos
-- dejar registrada) la próxima consulta sin salir de la ficha. Para
-- esta primera iteración solo guardamos fecha + nota; no creamos cita
-- todavía (eso es V2 — la vet pidió "que aparezca el calendario", no
-- "que cree la cita"). Al cierre de la ficha quedará disponible la
-- fecha de control para que la recepcionista la agende.
-- ============================================

ALTER TABLE clinical_records
  ADD COLUMN IF NOT EXISTS next_consultation_date date NULL,
  ADD COLUMN IF NOT EXISTS next_consultation_note text NULL;
