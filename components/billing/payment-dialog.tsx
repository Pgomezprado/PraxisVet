"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { paymentSchema, type PaymentInput } from "@/lib/validations/billing";
import { registerPayment } from "@/app/[clinic]/billing/actions";

interface PaymentDialogProps {
  orgId: string;
  invoiceId: string;
  remaining: number;
  children: React.ReactNode;
}

export function PaymentDialog({
  orgId,
  invoiceId,
  remaining,
  children,
}: PaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      amount: remaining > 0 ? Number(remaining.toFixed(2)) : 0,
      method: "cash",
      reference: "",
      notes: "",
    },
  });

  async function onSubmit(data: PaymentInput) {
    setLoading(true);
    setError(null);

    const result = await registerPayment(orgId, invoiceId, data);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    reset();
    setOpen(false);
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Saldo pendiente: ${remaining.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Monto</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="pl-7"
                  {...register("amount", { valueAsNumber: true })}
                />
              </div>
              {errors.amount && (
                <p className="text-sm text-destructive">
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">Metodo de pago</Label>
              <Select
                id="payment-method"
                {...register("method")}
              >
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="other">Otro</option>
              </Select>
              {errors.method && (
                <p className="text-sm text-destructive">
                  {errors.method.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-reference">Referencia (opcional)</Label>
            <Input
              id="payment-reference"
              placeholder="Numero de transaccion, recibo, etc."
              {...register("reference")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-notes">Notas (opcional)</Label>
            <Textarea
              id="payment-notes"
              placeholder="Notas adicionales..."
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Registrando..." : "Registrar pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
