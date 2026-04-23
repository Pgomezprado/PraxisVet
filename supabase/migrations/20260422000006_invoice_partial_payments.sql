-- ============================================
-- Sprint 5 · Bloque 3 — Abonos manuales (pagos parciales)
-- ============================================
-- Permite que una factura pueda tener pagos parciales registrados con un
-- estado intermedio `partial_paid`. La columna `amount_paid` se mantiene
-- denormalizada por un trigger para evitar SUM() en cada lectura.
--
-- Reglas del trigger:
--   * Recalcula amount_paid = SUM(payments.amount) en cada INSERT/UPDATE/DELETE
--     de la tabla payments.
--   * Ajusta el status SOLO si la factura no esta en estado terminal o draft:
--       - amount_paid >= total            -> 'paid'    (paid_at = now() si NULL)
--       - 0 < amount_paid < total         -> 'partial_paid' (paid_at = NULL)
--       - amount_paid = 0                 -> revierte a 'sent' u 'overdue' segun due_date
--   * No toca facturas en 'draft' o 'cancelled' (esos estados son explicitos).
-- ============================================

BEGIN;

-- 1. Ampliar el CHECK de status para incluir 'partial_paid'.
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'partial_paid'));

-- 2. Columna denormalizada amount_paid.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2) NOT NULL DEFAULT 0;

-- 3. Backfill: cargar amount_paid con la suma actual de payments por invoice.
UPDATE public.invoices i
SET amount_paid = COALESCE(p.total_paid, 0)
FROM (
  SELECT invoice_id, SUM(amount)::numeric(10,2) AS total_paid
  FROM public.payments
  GROUP BY invoice_id
) p
WHERE i.id = p.invoice_id;

-- 4. Backfill: setear partial_paid en facturas con pagos pero no completas.
UPDATE public.invoices
SET status = 'partial_paid'
WHERE status IN ('sent', 'overdue')
  AND amount_paid > 0
  AND amount_paid + 0.009 < total;

-- 5. Trigger function que mantiene amount_paid y ajusta status.
CREATE OR REPLACE FUNCTION public.recalc_invoice_amount_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv_id uuid;
  new_amount numeric(10,2);
  inv_total numeric(10,2);
  inv_status text;
  inv_due date;
  next_status text;
BEGIN
  inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(amount), 0)::numeric(10,2)
    INTO new_amount
  FROM public.payments
  WHERE invoice_id = inv_id;

  SELECT total, status, due_date
    INTO inv_total, inv_status, inv_due
  FROM public.invoices
  WHERE id = inv_id;

  IF inv_total IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Estados explicitos del usuario: solo actualizamos amount_paid, no el status.
  IF inv_status IN ('draft', 'cancelled') THEN
    UPDATE public.invoices
      SET amount_paid = new_amount
      WHERE id = inv_id;
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF new_amount + 0.009 >= inv_total AND inv_total > 0 THEN
    next_status := 'paid';
  ELSIF new_amount > 0 THEN
    next_status := 'partial_paid';
  ELSE
    next_status := CASE
      WHEN inv_due IS NOT NULL AND inv_due < CURRENT_DATE THEN 'overdue'
      ELSE 'sent'
    END;
  END IF;

  UPDATE public.invoices
    SET amount_paid = new_amount,
        status = next_status,
        paid_at = CASE
          WHEN next_status = 'paid' THEN COALESCE(paid_at, now())
          ELSE NULL
        END
    WHERE id = inv_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. Triggers en payments (INSERT, UPDATE, DELETE).
DROP TRIGGER IF EXISTS trg_payments_recalc_invoice ON public.payments;

CREATE TRIGGER trg_payments_recalc_invoice
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.recalc_invoice_amount_paid();

-- 7. Indice para acelerar la vista de saldos pendientes por cliente.
CREATE INDEX IF NOT EXISTS idx_invoices_pending
  ON public.invoices (org_id, client_id)
  WHERE status IN ('sent', 'overdue', 'partial_paid');

COMMIT;
