-- Agrega estado reproductivo al paciente.
-- Valores: 'intact' (entero/entera) | 'sterilized' (castrado/esterilizada).
-- La etiqueta en UI depende del sexo del paciente.

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS reproductive_status text
    CHECK (reproductive_status IN ('intact', 'sterilized'));
