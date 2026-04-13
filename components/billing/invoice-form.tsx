"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { invoiceSchema, type InvoiceInput } from "@/lib/validations/billing";
import { useClinic } from "@/lib/context/clinic-context";
import { createInvoice } from "@/app/[clinic]/billing/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InvoiceFormProps {
  clients: { id: string; first_name: string; last_name: string }[];
  defaultClientId?: string;
  defaultAppointmentId?: string;
  defaultItems?: {
    description: string;
    quantity: number;
    unit_price: number;
    item_type?: "service" | "product";
  }[];
}

export function InvoiceForm({
  clients,
  defaultClientId,
  defaultAppointmentId,
  defaultItems,
}: InvoiceFormProps) {
  const router = useRouter();
  const { organization, clinicSlug } = useClinic();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      client_id: defaultClientId ?? "",
      appointment_id: defaultAppointmentId ?? "",
      tax_rate: 16,
      due_date: "",
      notes: "",
      items: defaultItems?.length
        ? defaultItems
        : [{ description: "", quantity: 1, unit_price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = useWatch({ control, name: "items" });
  const watchedTaxRate = useWatch({ control, name: "tax_rate" });

  const subtotal = (watchedItems ?? []).reduce((sum, item) => {
    const qty = Number(item?.quantity) || 0;
    const price = Number(item?.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const taxRate = Number(watchedTaxRate) || 0;
  const taxAmount = Math.round(subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  async function onSubmit(data: InvoiceInput) {
    setLoading(true);
    setError(null);

    const result = await createInvoice(organization.id, data);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/${clinicSlug}/billing/${result.data.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Datos de la factura</CardTitle>
          <CardDescription>
            Selecciona el cliente y configura los datos generales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente</Label>
              <Select id="client_id" {...register("client_id")}>
                <option value="">Seleccionar cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                  </option>
                ))}
              </Select>
              {errors.client_id && (
                <p className="text-sm text-destructive">
                  {errors.client_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Fecha de vencimiento (opcional)</Label>
              <Input
                id="due_date"
                type="date"
                {...register("due_date")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tax_rate">Tasa de impuesto (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                min={0}
                max={100}
                step="0.01"
                {...register("tax_rate", { valueAsNumber: true })}
              />
              {errors.tax_rate && (
                <p className="text-sm text-destructive">
                  {errors.tax_rate.message}
                </p>
              )}
            </div>
          </div>

          {defaultAppointmentId && (
            <input
              type="hidden"
              {...register("appointment_id")}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales para la factura..."
              {...register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Conceptos</CardTitle>
              <CardDescription>
                Agrega los productos o servicios a facturar.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ description: "", quantity: 1, unit_price: 0 })
              }
            >
              <Plus className="size-3.5" />
              Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {errors.items?.root && (
            <p className="mb-3 text-sm text-destructive">
              {errors.items.root.message}
            </p>
          )}
          {errors.items && "message" in errors.items && (
            <p className="mb-3 text-sm text-destructive">
              {(errors.items as { message?: string }).message}
            </p>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Descripción</TableHead>
                <TableHead className="w-[15%]">Tipo</TableHead>
                <TableHead className="w-[12%] text-right">Cantidad</TableHead>
                <TableHead className="w-[15%] text-right">
                  Precio unit.
                </TableHead>
                <TableHead className="w-[13%] text-right">Subtotal</TableHead>
                <TableHead className="w-[5%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => {
                const qty = Number(watchedItems?.[index]?.quantity) || 0;
                const price = Number(watchedItems?.[index]?.unit_price) || 0;
                const lineTotal = qty * price;

                return (
                  <TableRow key={field.id}>
                    <TableCell>
                      <Input
                        placeholder="Descripción del concepto"
                        {...register(`items.${index}.description`)}
                      />
                      {errors.items?.[index]?.description && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.items[index].description.message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select {...register(`items.${index}.item_type`)}>
                        <option value="">--</option>
                        <option value="service">Servicio</option>
                        <option value="product">Producto</option>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        step="1"
                        className="text-right"
                        {...register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="pl-5 text-right"
                          {...register(`items.${index}.unit_price`, {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${lineTotal.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="text-right font-medium">
                  Subtotal
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${subtotal.toFixed(2)}
                </TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} className="text-right font-medium">
                  Impuesto ({taxRate}%)
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${taxAmount.toFixed(2)}
                </TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} className="text-right text-base font-bold">
                  Total
                </TableCell>
                <TableCell className="text-right text-base font-bold">
                  ${total.toFixed(2)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Creando factura..." : "Crear factura"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${clinicSlug}/billing`)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
