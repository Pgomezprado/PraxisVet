-- ============================================
-- Relajar: "con_hallazgos" ya NO exige findings no vacío
-- ============================================
-- Feedback UX 2026-04-19 (segunda revisión): la validación que bloqueaba el
-- submit completo cuando el vet marcaba "con hallazgos" sin describirlos
-- interrumpe el flujo en consultas rápidas. Ahora permitimos guardar el status
-- con findings vacío; la UI muestra un warning ámbar no bloqueante y marca la
-- ficha como "hallazgo sin describir" en el detalle.
-- ============================================

ALTER TABLE clinical_records
  DROP CONSTRAINT IF EXISTS heart_auscultation_findings_required,
  DROP CONSTRAINT IF EXISTS respiratory_auscultation_findings_required;
