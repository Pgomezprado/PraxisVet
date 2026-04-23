"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { FilterSelect } from "@/components/ui/filter-select";
import { toggleProductActive, type ProductWithStock } from "@/app/[clinic]/inventory/actions";
import { StockIndicator } from "./stock-indicator";
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "./category-labels";
import type { ProductCategory } from "@/types";
import { cn } from "@/lib/utils";
import { formatCLP } from "@/lib/utils/format";

interface ProductsTableProps {
  products: ProductWithStock[];
  clinicSlug: string;
  alertCount: number;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  search?: string;
  category?: string;
}

export function ProductsTable({
  products,
  clinicSlug,
  alertCount,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  search,
  category,
}: ProductsTableProps) {
  const [pending, startTransition] = useTransition();
  const [toggleProduct, setToggleProduct] = useState<ProductWithStock | null>(null);

  function handleToggleConfirm() {
    if (!toggleProduct) return;
    startTransition(async () => {
      await toggleProductActive(toggleProduct.id, toggleProduct.active, clinicSlug);
      setToggleProduct(null);
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
        <SearchInput placeholder="Buscar por nombre o SKU..." />
        <FilterSelect
          paramName="category"
          options={CATEGORY_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          placeholder="Todas las categorías"
          className="w-44"
        />
        <Button render={<Link href={`/${clinicSlug}/inventory/new`} />}>
          <Plus className="size-4" data-icon="inline-start" />
          Nuevo producto
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Package className="size-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {search || category
              ? "No se encontraron productos con esos filtros."
              : "Aún no hay productos registrados."}
          </p>
          {!search && !category && (
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
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Min.</TableHead>
                <TableHead>Precio venta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
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
                      ? formatCLP(product.sale_price)
                      : "--"}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setToggleProduct(product)}
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

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            baseUrl={`/${clinicSlug}/inventory`}
            searchParams={{ search, category }}
          />
        </>
      )}
      <Dialog
        open={!!toggleProduct}
        onOpenChange={(open) => {
          if (!open) setToggleProduct(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {toggleProduct?.active ? "Desactivar" : "Reactivar"} producto
            </DialogTitle>
            <DialogDescription>
              {toggleProduct?.active
                ? `¿Desactivar ${toggleProduct.name}? No aparecerá en búsquedas ni se podrá usar en facturas.`
                : `¿Reactivar ${toggleProduct?.name}? Volverá a estar disponible en búsquedas y facturas.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleProduct(null)}>
              Cancelar
            </Button>
            <Button
              variant={toggleProduct?.active ? "destructive" : "default"}
              disabled={pending}
              onClick={handleToggleConfirm}
            >
              {pending
                ? "Procesando..."
                : toggleProduct?.active
                  ? "Desactivar"
                  : "Reactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
