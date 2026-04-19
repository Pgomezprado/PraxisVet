-- Agrega flag "no audible por ruidos agregados" al registro clínico.
-- Feedback veterinario 2026-04-19: hay pacientes con jadeo intenso en los que
-- no es posible auscultar la frecuencia cardiaca. Se necesita dejar constancia
-- explícita en la ficha en lugar de omitir el campo.

ALTER TABLE clinical_records
  ADD COLUMN IF NOT EXISTS heart_rate_unmeasurable boolean NOT NULL DEFAULT false;

-- Un registro no debe tener valor numérico y flag de no-medible simultáneamente.
ALTER TABLE clinical_records
  ADD CONSTRAINT heart_rate_unmeasurable_exclusive
    CHECK (NOT (heart_rate_unmeasurable = true AND heart_rate IS NOT NULL));
