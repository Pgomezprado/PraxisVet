"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import {
  invoiceUpdateSchema,
  invoiceItemSchema,
  type InvoiceUpdateInput,
  type InvoiceItemInput,
} from "@/lib/validations/billing";
import {
  updateInvoice,
  addInvoiceItem,
  removeInvoiceItem,
} from "@/app/[clinic]/billing/actions";
import type { InvoiceDetail } from "@/app/[clinic]/billing/actions";
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

function formatCurrency(amount: number): string {
  return `$${Number(amount).toFixed(2)}`;
}

interface EditInvoiceFormProps {
  invoice: InvoiceDetail;
  clients: { id: string; first_name: string; last_name: string }[];
  clinicSlug: string;
}

export function EditInvoiceForm({
  invoice,
  clients,
  clinicSlug,
}: EditInvoiceFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [removingItem, setRemovingItem] = useState<string | null>(null);

  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newItemType, setNewItemType] = useState<string>("");
  const [addingItem, setAddingItem] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<InvoiceUpdateInput>({
    resolver: zodResolver(invoiceUpdateSchema) as any,
    defaultValues: {
      tax_rate: invoice.tax_rate,
      due_date: invoice.due_date ?? "",
      notes: invoice.notes ?? "",
    },
  });

  async function onSubmit(data: InvoiceUpdateInput) {
    setLoading(true);
    setError(null);

    const result = await updateInvoice(invoice.org_id, invoice.id, data);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/${clinicSlug}/billing/${invoice.id}`);
  }

  async function handleAddItem() {
    if (!newItemDesc.trim()) return;
    setAddingItem(true);

    const item: InvoiceItemInput = {
      description: newItemDesc,
      quantity: newItemQty,
      unit_price: newItemPrice,
      item_type: newItemType === "service" || newItemType === "product" ? newItemType : undefined,
    };

    const result = await addInvoiceItem(invoice.org_id, invoice.id, item);
    if (!result.success) {
      alert(result.error);
    } else {
      setNewItemDesc("");
      setNewItemQty(1);
      setNewItemPrice(0);
      setNewItemType("");
      router.refresh();
    }
    setAddingItem(false);
  }

  async function handleRemoveItem(itemId: string) {
    setRemovingItem(itemId);
    const result = await removeInvoiceItem(invoice.org_id, itemId, invoice.id);
    if (!result.success) {
      alert(result.error);
    } else {
      router.refresh();
    }
    setRemovingItem(null);
  }

  const clientName = clients.find((c) => c.id === invoice.client_id);
  const clientLabel = clientName
    ? `${clientName.first_name} ${clientName.last_name}`
    : "Cliente desconocido";

  return (
    <div className="space-y-6">
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
              Cliente: {clientLabel}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="due_date">
                  Fecha de vencimiento (opcional)
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  {...register("due_date")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Notas adicionales..."
                {...register("notes")}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(`/${clinicSlug}/billing/${invoice.id}`)
                }
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Conceptos</CardTitle>
          <CardDescription>
            Agrega o elimina conceptos de la factura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripcion</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unit_price)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.total)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={
                        removingItem === item.id || invoice.items.length <= 1
                      }
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell>
                  <Input
                    placeholder="Nuevo concepto..."
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(Number(e.target.value))}
                    className="text-right"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(Number(e.target.value))}
                    className="text-right"
                  />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(newItemQty * newItemPrice)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={addingItem || !newItemDesc.trim()}
                    onClick={handleAddItem}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">
                  Subtotal
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(invoice.subtotal)}
                </TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">
                  Impuesto ({invoice.tax_rate}%)
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(invoice.tax_amount)}
                </TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} className="text-right text-base font-bold">
                  Total
                </TableCell>
                <TableCell className="text-right text-base font-bold">
                  {formatCurrency(invoice.total)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
