-- Sprint hotfix (2026-05-03): abono al confirmar cita de peluquería.
--
-- Contexto: las clínicas cobran un ABONO (depósito parcial) al reservar la hora
-- de peluquería para confirmar la cita. Ese abono se descuenta del total cuando
-- se completa el servicio. Hoy (2026-05-03) Paws & Hair tuvo problemas porque
-- el sistema no soporta este flujo: los pagos parciales del Sprint 5 viven a
-- nivel de `invoices.payments`, pero la factura recién se crea cuando termina
-- el servicio — no al reservar.
--
-- Solución mínima (Opción A discutida con Pablo): registrar el abono en la
-- propia cita. Cuando después se cree la factura ligada a esa cita, se
-- pre-cargará un `payments` row con este monto, dejando la factura ya en
-- `partial_paid` con el saldo correcto.
--
-- Decisiones:
--   - `deposit_amount numeric(10,0)`: monto LIBRE que define recepción cada
--     vez (no hay "abono estándar configurable" — confirmado por Pablo).
--     CLP entero como el resto del schema.
--   - `deposit_paid_at timestamptz`: cuándo se cobró (auditoría + UI).
--   - `deposit_collected_by uuid`: qué miembro lo cobró. ON DELETE SET NULL
--     para no perder el registro si el miembro se da de baja.
--   - CHECK `deposit_only_grooming`: las citas médicas no pueden tener abono
--     (no hay flujo de reserva con depósito en consultas).
--   - CHECK de coherencia: o ambos (amount + paid_at) están NULL, o ambos
--     están presentes. Evita estados intermedios inválidos.
--   - Cancelaciones con devolución de abono: pendiente para iteración futura.
--     Por ahora la clínica resuelve manualmente con nota.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS deposit_amount numeric(10,0) NULL,
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deposit_collected_by uuid NULL
    REFERENCES organization_members(id) ON DELETE SET NULL;

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS deposit_only_grooming;

ALTER TABLE appointments
  ADD CONSTRAINT deposit_only_grooming
  CHECK (
    deposit_amount IS NULL
    OR (type = 'grooming' AND deposit_amount > 0)
  );

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS deposit_amount_paid_at_consistency;

ALTER TABLE appointments
  ADD CONSTRAINT deposit_amount_paid_at_consistency
  CHECK (
    (deposit_amount IS NULL AND deposit_paid_at IS NULL)
    OR (deposit_amount IS NOT NULL AND deposit_paid_at IS NOT NULL)
  );

COMMENT ON COLUMN appointments.deposit_amount IS
  'Monto del abono cobrado al confirmar la cita (CLP entero). Solo type=grooming. Se descuenta del total al cobrar el servicio.';
COMMENT ON COLUMN appointments.deposit_paid_at IS
  'Timestamp en que se registró el abono. NULL si no hay abono.';
COMMENT ON COLUMN appointments.deposit_collected_by IS
  'Miembro que registró el abono (auditoría). SET NULL si el miembro se elimina.';
