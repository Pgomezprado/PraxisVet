"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Wallet,
  Plus,
  Pencil,
  Loader2,
  Banknote,
  Link2,
  Building2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCLP } from "@/lib/utils/format";
import {
  recordAppointmentDeposit,
  clearAppointmentDeposit,
} from "@/app/[clinic]/appointments/actions";
import {
  DEPOSIT_METHOD_LABELS,
  type DepositMethodValue,
} from "@/lib/validations/appointments";

interface DepositCardProps {
  appointmentId: string;
  depositAmount: number | null;
  depositPaidAt: string | null;
  depositMethod: DepositMethodValue | null;
  depositReference: string | null;
  canManage: boolean;
}

const METHOD_ICONS: Record<DepositMethodValue, typeof Banknote> = {
  cash: Banknote,
  payment_link: Link2,
  transfer: Building2,
};

const REFERENCE_LABELS: Record<DepositMethodValue, string> = {
  cash: "N° de boleta o comprobante (opcional)",
  payment_link: "Link enviado o ID de pago",
  transfer: "N° de transferencia",
};

const REFERENCE_PLACEHOLDERS: Record<DepositMethodValue, string> = {
  cash: "Ej: comprobante 1234",
  payment_link: "Ej: https://mpago.la/... o ID",
  transfer: "Ej: 8 últimos dígitos del comprobante",
};

export function DepositCard({
  appointmentId,
  depositAmount,
  depositPaidAt,
  depositMethod,
  depositReference,
  canManage,
}: DepositCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>(
    depositAmount != null ? String(depositAmount) : ""
  );
  const [method, setMethod] = useState<DepositMethodValue>(
    depositMethod ?? "cash"
  );
  const [reference, setReference] = useState<string>(depositReference ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasDeposit = depositAmount != null && depositAmount > 0;

  function handleSave() {
    setError(null);
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      setError("Ingresa un monto válido en pesos (entero, mayor a 0).");
      return;
    }
    const trimmedRef = reference.trim();
    if (method !== "cash" && trimmedRef.length === 0) {
      setError(
        "Para link de pago o transferencia, anota el n° o link de referencia."
      );
      return;
    }
    startTransition(async () => {
      const result = await recordAppointmentDeposit(appointmentId, {
        amount: parsed,
        method,
        reference: trimmedRef,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function handleClear() {
    setError(null);
    startTransition(async () => {
      const result = await clearAppointmentDeposit(appointmentId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setAmount("");
      setMethod("cash");
      setReference("");
      setOpen(false);
      router.refresh();
    });
  }

  const dateLabel = depositPaidAt
    ? format(new Date(depositPaidAt), "d 'de' MMMM, yyyy", { locale: es })
    : null;

  const MethodIcon = depositMethod ? METHOD_ICONS[depositMethod] : null;
  const methodLabel = depositMethod
    ? DEPOSIT_METHOD_LABELS[depositMethod]
    : null;

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 py-4">
        <div className="flex items-start gap-3">
          <Wallet className="mt-0.5 size-4 text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {hasDeposit ? "Abono cobrado" : "Abono al confirmar"}
            </p>
            {hasDeposit ? (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">
                    {formatCLP(depositAmount)}
                  </span>
                  {dateLabel && <> · cobrado el {dateLabel}</>}
                </p>
                {methodLabel && (
                  <p className="flex items-center gap-1.5">
                    {MethodIcon && (
                      <MethodIcon className="size-3.5 text-muted-foreground" />
                    )}
                    <span>{methodLabel}</span>
                    {depositReference && (
                      <>
                        <span>·</span>
                        <span className="font-medium text-foreground">
                          {depositReference}
                        </span>
                      </>
                    )}
                  </p>
                )}
                <p>Se descuenta del total al cobrar el servicio.</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Cobra un abono para confirmar la hora. Se descontará del total
                cuando emitas la boleta.
              </p>
            )}
          </div>
        </div>

        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button variant={hasDeposit ? "outline" : "default"} size="sm">
                  {hasDeposit ? (
                    <>
                      <Pencil className="size-3.5" data-icon="inline-start" />
                      Modificar
                    </>
                  ) : (
                    <>
                      <Plus className="size-3.5" data-icon="inline-start" />
                      Registrar abono
                    </>
                  )}
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {hasDeposit ? "Modificar abono" : "Registrar abono"}
                </DialogTitle>
                <DialogDescription>
                  Monto que el tutor pagó por adelantado para confirmar la hora.
                  Se descontará automáticamente al cobrar el servicio.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="deposit-amount">Monto del abono</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="deposit-amount"
                      type="number"
                      inputMode="numeric"
                      step="1"
                      min="1"
                      placeholder="Ej: 10000"
                      className="pl-7"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pesos chilenos, sin decimales.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>¿Cómo lo pagó?</Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(
                      Object.entries(DEPOSIT_METHOD_LABELS) as [
                        DepositMethodValue,
                        string,
                      ][]
                    ).map(([value, label]) => {
                      const Icon = METHOD_ICONS[value];
                      const selected = method === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setMethod(value)}
                          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                            selected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-background hover:border-primary/50"
                          }`}
                          aria-pressed={selected}
                        >
                          <Icon className="size-4 shrink-0 text-primary" />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deposit-reference">
                    {REFERENCE_LABELS[method]}
                  </Label>
                  <Input
                    id="deposit-reference"
                    type="text"
                    placeholder={REFERENCE_PLACEHOLDERS[method]}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    maxLength={120}
                  />
                  {method !== "cash" && (
                    <p className="text-xs text-muted-foreground">
                      Útil para conciliar después con tu banco o pasarela.
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                {hasDeposit && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClear}
                    disabled={pending}
                    className="mr-auto text-destructive hover:text-destructive"
                  >
                    Anular abono
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancelar
                </Button>
                <Button type="button" onClick={handleSave} disabled={pending}>
                  {pending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" />
                      Guardando...
                    </>
                  ) : hasDeposit ? (
                    "Guardar cambios"
                  ) : (
                    "Registrar abono"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
