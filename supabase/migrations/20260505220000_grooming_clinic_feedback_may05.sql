-- Sprint feedback Paws & Hair (2026-05-05): tres mejoras pedidas por la
-- clínica que está en piloto, todas para el flujo de peluquería.
--
-- 1) Abono de cita de peluquería: además del monto, registrar el medio de
--    pago (efectivo presencial / link de pago / transferencia) y un
--    identificador de referencia (n° de transferencia o link enviado al
--    tutor). Hoy solo guardamos el monto, lo que obliga a la admin a anotar
--    el medio en un cuaderno aparte.
--
-- 2) Animal peligroso ahora es propiedad de la MASCOTA (pets), no solo de la
--    cita. Aún se mantiene `appointments.is_dangerous` (override puntual:
--    "hoy llegó muy alterado") pero el flag de la ficha de la mascota es la
--    fuente de verdad por defecto. Cualquier cita nueva debe heredarlo.
--
-- 3) (Solo lectura, no requiere migración) Mostrar resumen del último
--    grooming al iniciar uno nuevo. Se resuelve a nivel de query del
--    formulario, sin cambios de schema.
--
-- Decisiones:
--   - `deposit_method` text con CHECK acotado a 3 valores ('cash' |
--     'payment_link' | 'transfer'). Mantener simple — la clínica no usa
--     POS ni tarjeta hoy.
--   - `deposit_reference` text NULL — opcional para 'cash', recomendado
--     para los otros dos. La validación blanda vive en la UI (no rompemos
--     pagos antiguos sin referencia).
--   - Coherencia: si hay abono (deposit_amount NOT NULL) debe haber método.
--     Permite NULL método solo cuando no hay abono. Para abonos viejos sin
--     método existentes (Paws & Hair acumuló unos pocos en producción), se
--     migran a 'cash' antes del CHECK.
--   - `pets.is_dangerous` boolean NOT NULL DEFAULT false, igual al patrón
--     de appointments. Triggers ni denormalización: la lectura cruzada
--     (badge en la cita) la hace el cliente al leer pet.is_dangerous.

-- ─────────────────────────────────────────────────────────────────────────
-- (1) Método y referencia de pago del abono de peluquería
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS deposit_method text NULL,
  ADD COLUMN IF NOT EXISTS deposit_reference text NULL;

-- Backfill: abonos existentes sin método se asumen como efectivo.
UPDATE appointments
SET deposit_method = 'cash'
WHERE deposit_amount IS NOT NULL
  AND deposit_method IS NULL;

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS deposit_method_valid;

ALTER TABLE appointments
  ADD CONSTRAINT deposit_method_valid
  CHECK (
    deposit_method IS NULL
    OR deposit_method IN ('cash', 'payment_link', 'transfer')
  );

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS deposit_method_requires_amount;

ALTER TABLE appointments
  ADD CONSTRAINT deposit_method_requires_amount
  CHECK (
    (deposit_amount IS NULL AND deposit_method IS NULL)
    OR (deposit_amount IS NOT NULL AND deposit_method IS NOT NULL)
  );

COMMENT ON COLUMN appointments.deposit_method IS
  'Medio por el que se cobró el abono: cash (efectivo presencial), payment_link (link de pago enviado), transfer (transferencia bancaria). NULL si no hay abono.';
COMMENT ON COLUMN appointments.deposit_reference IS
  'Identificador del pago: número de transferencia o link enviado al tutor. Opcional; útil para conciliación.';

-- ─────────────────────────────────────────────────────────────────────────
-- (2) Flag "animal peligroso" a nivel de mascota (fuente de verdad)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS is_dangerous boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN pets.is_dangerous IS
  'Mascota marcada como peligrosa/agresiva por la clínica. Default para cualquier cita nueva. Cita individual puede sobreescribirlo en appointments.is_dangerous.';
