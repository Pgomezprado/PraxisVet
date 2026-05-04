"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Wallet, Plus, Pencil, Loader2 } from "lucide-react";
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

interface DepositCardProps {
  appointmentId: string;
  depositAmount: number | null;
  depositPaidAt: string | null;
  canManage: boolean;
}

export function DepositCard({
  appointmentId,
  depositAmount,
  depositPaidAt,
  canManage,
}: DepositCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>(
    depositAmount != null ? String(depositAmount) : ""
  );
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
    startTransition(async () => {
      const result = await recordAppointmentDeposit(appointmentId, parsed);
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
      setOpen(false);
      router.refresh();
    });
  }

  const dateLabel = depositPaidAt
    ? format(new Date(depositPaidAt), "d 'de' MMMM, yyyy", { locale: es })
    : null;

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <Wallet className="size-4 text-primary" />
          <div>
            <p className="text-sm font-medium">
              {hasDeposit ? "Abono cobrado" : "Abono al confirmar"}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasDeposit ? (
                <>
                  <span className="font-medium text-foreground">
                    {formatCLP(depositAmount)}
                  </span>
                  {dateLabel && <> · cobrado el {dateLabel}</>}
                  <> · se descuenta del total al cobrar el servicio.</>
                </>
              ) : (
                "Cobra un abono para confirmar la hora. Se descontará del total cuando emitas la boleta."
              )}
            </p>
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
