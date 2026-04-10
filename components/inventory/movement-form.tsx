"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  stockMovementSchema,
  type StockMovementInput,
} from "@/lib/validations/inventory";
import { useClinic } from "@/lib/context/clinic-context";
import { registerMovement } from "@/app/[clinic]/inventory/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  MOVEMENT_TYPE_OPTIONS,
  MOVEMENT_REASON_OPTIONS,
} from "./category-labels";
import { StockIndicator } from "./stock-indicator";
import type { ProductUnit } from "@/types";

interface MovementFormProps {
  productId: string;
  productName: string;
  currentStock: number;
  unit: ProductUnit;
  minStock: number;
}

export function MovementForm({
  productId,
  productName,
  currentStock,
  unit,
  minStock,
}: MovementFormProps) {
  const router = useRouter();
  const { organization, clinicSlug } = useClinic();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StockMovementInput>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: {
      product_id: productId,
      type: "in",
      quantity: "",
      reason: "",
      notes: "",
    },
  });

  async function onSubmit(data: StockMovementInput) {
    setLoading(true);
    setError(null);

    const result = await registerMovement(organization.id, clinicSlug, data);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/${clinicSlug}/inventory/${productId}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar movimiento</CardTitle>
        <CardDescription>
          Registra una entrada, salida o ajuste de stock para{" "}
          <span className="font-medium text-foreground">{productName}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex items-center gap-3 rounded-lg border p-3">
          <span className="text-sm text-muted-foreground">Stock actual:</span>
          <StockIndicator
            quantity={currentStock}
            minStock={minStock}
            unit={unit}
          />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <input type="hidden" {...register("product_id")} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de movimiento</Label>
              <Select id="type" {...register("type")}>
                {MOVEMENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0"
                {...register("quantity")}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">
                  {errors.quantity.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Raz\u00f3n (opcional)</Label>
            <Select id="reason" {...register("reason")}>
              <option value="">Seleccionar...</option>
              {MOVEMENT_REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales del movimiento..."
              {...register("notes")}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Registrando..." : "Registrar movimiento"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(`/${clinicSlug}/inventory/${productId}`)
              }
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
