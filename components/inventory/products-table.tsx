"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Search, Plus, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toggleProductActive, type ProductWithStock } from "@/app/[clinic]/inventory/actions";
import { StockIndicator } from "./stock-indicator";
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "./category-labels";
import type { ProductCategory } from "@/types";
import { cn } from "@/lib/utils";

interface ProductsTableProps {
  products: ProductWithStock[];
  clinicSlug: string;
  alertCount: number;
}

export function ProductsTable({
  products,
  clinicSlug,
  alertCount,
}: ProductsTableProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = products.filter((product) => {
    const term = search.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(term) ||
      (product.sku?.toLowerCase().includes(term) ?? false);
    const matchesCategory =
      !categoryFilter || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  function handleToggleActive(productId: string, currentActive: boolean) {
    startTransition(async () => {
      await toggleProductActive(productId, currentActive, clinicSlug);
    });
  }

  return (
    <div className="space-y-4">
      {alertCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
          <Badge variant="destructive">{alertCount}</Badge>
          <span className="text-sm text-red-700 dark:text-red-400">
            {alertCount === 1
              ? "producto con stock bajo"
              : "productos con stock bajo"}
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-44"
        >
          <option value="">Todas las categorias</option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Button render={<Link href={`/${clinicSlug}/inventory/new`} />}>
          <Plus className="size-4" data-icon="inline-start" />
          Nuevo producto
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Package className="size-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {search || categoryFilter
              ? "No se encontraron productos con esos filtros."
              : "Aun no hay productos registrados."}
          </p>
          {!search && !categoryFilter && (
            <Button
              variant="outline"
              className="mt-4"
              render={<Link href={`/${clinicSlug}/inventory/new`} />}
            >
              <Plus className="size-4" data-icon="inline-start" />
              Registrar primer producto
            </Button>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Min.</TableHead>
              <TableHead>Precio venta</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((product) => (
              <TableRow
                key={product.id}
                className={cn(!product.active && "opacity-50")}
              >
                <TableCell>
                  <Link
                    href={`/${clinicSlug}/inventory/${product.id}`}
                    className="font-medium hover:underline"
                  >
                    {product.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {product.sku || "--"}
                </TableCell>
                <TableCell>
                  {product.category ? (
                    <Badge variant="secondary">
                      {CATEGORY_LABELS[product.category as ProductCategory]}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </TableCell>
                <TableCell>
                  <StockIndicator
                    quantity={product.stock_quantity}
                    minStock={product.min_stock}
                    unit={product.unit}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {product.min_stock}
                </TableCell>
                <TableCell>
                  {product.sale_price != null
                    ? `$${product.sale_price.toFixed(2)}`
                    : "--"}
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      handleToggleActive(product.id, product.active)
                    }
                    className="cursor-pointer"
                  >
                    <Badge
                      variant={product.active ? "default" : "secondary"}
                    >
                      {product.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <Link
                        href={`/${clinicSlug}/inventory/${product.id}`}
                      />
                    }
                  >
                    Ver
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
