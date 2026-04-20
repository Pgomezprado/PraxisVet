-- ============================================
-- Hallazgos a la auscultación cardíaca y respiratoria
-- ============================================
-- Feedback veterinario 2026-04-19: en lugar de escribir "sin hallazgos
-- patológicos" en observaciones, queremos estructurarlo. Un radio con dos
-- opciones (sin/con hallazgos) y, si hay hallazgos, un textarea libre.
-- Aplicable a frecuencia cardíaca y a frecuencia respiratoria por
-- separado, porque la vet ausculta cada sistema independientemente.
--
-- Decisiones de diseño:
--   - status NULL = "no evaluado" (compatibilidad con fichas anteriores)
--   - status='con_hallazgos' exige findings no vacío (CHECK)
--   - status='sin_hallazgos' permite findings NULL
-- ============================================

ALTER TABLE clinical_records
  ADD COLUMN IF NOT EXISTS heart_auscultation_status text NULL,
  ADD COLUMN IF NOT EXISTS heart_auscultation_findings text NULL,
  ADD COLUMN IF NOT EXISTS respiratory_auscultation_status text NULL,
  ADD COLUMN IF NOT EXISTS respiratory_auscultation_findings text NULL;

-- Valores permitidos para status (NULL = no evaluado).
ALTER TABLE clinical_records
  ADD CONSTRAINT heart_auscultation_status_values
    CHECK (
      heart_auscultation_status IS NULL
      OR heart_auscultation_status IN ('sin_hallazgos', 'con_hallazgos')
    ),
  ADD CONSTRAINT respiratory_auscultation_status_values
    CHECK (
      respiratory_auscultation_status IS NULL
      OR respiratory_auscultation_status IN ('sin_hallazgos', 'con_hallazgos')
    );

-- Si status='con_hallazgos', findings debe tener contenido.
ALTER TABLE clinical_records
  ADD CONSTRAINT heart_auscultation_findings_required
    CHECK (
      heart_auscultation_status IS DISTINCT FROM 'con_hallazgos'
      OR (
        heart_auscultation_findings IS NOT NULL
        AND length(btrim(heart_auscultation_findings)) > 0
      )
    ),
  ADD CONSTRAINT respiratory_auscultation_findings_required
    CHECK (
      respiratory_auscultation_status IS DISTINCT FROM 'con_hallazgos'
      OR (
        respiratory_auscultation_findings IS NOT NULL
        AND length(btrim(respiratory_auscultation_findings)) > 0
      )
    );
