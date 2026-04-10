"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductInput } from "@/lib/validations/inventory";
import { useClinic } from "@/lib/context/clinic-context";
import {
  createProduct,
  updateProduct,
} from "@/app/[clinic]/inventory/actions";
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
import { CATEGORY_OPTIONS, UNIT_OPTIONS } from "./category-labels";
import type { Product } from "@/types";

interface ProductFormProps {
  product?: Product;
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const { organization, clinicSlug } = useClinic();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isEditing = !!product;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      sku: product?.sku ?? "",
      category: product?.category ?? "",
      description: product?.description ?? "",
      unit: product?.unit ?? "unit",
      purchase_price: product?.purchase_price?.toString() ?? "",
      sale_price: product?.sale_price?.toString() ?? "",
      min_stock: product?.min_stock?.toString() ?? "0",
    },
  });

  async function onSubmit(data: ProductInput) {
    setLoading(true);
    setError(null);

    const result = isEditing
      ? await updateProduct(product!.id, clinicSlug, data)
      : await createProduct(organization.id, clinicSlug, data);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/${clinicSlug}/inventory/${result.data.id}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? "Editar producto" : "Nuevo producto"}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? "Modifica los datos del producto."
            : "Registra un nuevo producto en el inventario."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                placeholder="ej: Amoxicilina 500mg"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU (opcional)</Label>
              <Input
                id="sku"
                placeholder="ej: MED-001"
                {...register("sku")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Categor\u00eda (opcional)</Label>
              <Select id="category" {...register("category")}>
                <option value="">Seleccionar...</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unidad</Label>
              <Select id="unit" {...register("unit")}>
                {UNIT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripci\u00f3n (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Descripci\u00f3n del producto..."
              {...register("description")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="purchase_price">Precio compra (opcional)</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("purchase_price")}
              />
              {errors.purchase_price && (
                <p className="text-sm text-destructive">
                  {errors.purchase_price.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_price">Precio venta (opcional)</Label>
              <Input
                id="sale_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("sale_price")}
              />
              {errors.sale_price && (
                <p className="text-sm text-destructive">
                  {errors.sale_price.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_stock">Stock m\u00ednimo</Label>
              <Input
                id="min_stock"
                type="number"
                min="0"
                placeholder="0"
                {...register("min_stock")}
              />
              {errors.min_stock && (
                <p className="text-sm text-destructive">
                  {errors.min_stock.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading
                ? isEditing
                  ? "Guardando..."
                  : "Creando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Crear producto"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${clinicSlug}/inventory`)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
