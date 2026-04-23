import Link from "next/link";
import { Pencil, Plus, ArrowDownUp, Trash2 } from "lucide-react";
import { getProduct } from "../actions";
import { formatCLP } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StockIndicator } from "@/components/inventory/stock-indicator";
import {
  CATEGORY_LABELS,
  UNIT_LABELS,
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_REASON_LABELS,
} from "@/components/inventory/category-labels";
import type { ProductCategory, StockMovementType, StockMovementReason } from "@/types";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ clinic: string; productId: string }>;
}) {
  const { clinic, productId } = await params;

  const result = await getProduct(productId);

  if (!result.success) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {result.error}
      </div>
    );
  }

  const product = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {product.name}
            </h1>
            {!product.active && (
              <Badge variant="secondary">Inactivo</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {product.sku ? `SKU: ${product.sku}` : "Sin SKU"}{" "}
            {product.category &&
              ` / ${CATEGORY_LABELS[product.category as ProductCategory]}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                href={`/${clinic}/inventory/${productId}/movement`}
              />
            }
          >
            <ArrowDownUp className="size-4" data-icon="inline-start" />
            Movimiento
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={`/${clinic}/inventory/${productId}/edit`} />
            }
          >
            <Pencil className="size-4" data-icon="inline-start" />
            Editar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stock actual</CardTitle>
          </CardHeader>
          <CardContent>
            <StockIndicator
              quantity={product.stock_quantity}
              minStock={product.min_stock}
              unit={product.unit}
              size="lg"
            />
            {product.low_stock && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                Stock por debajo del mínimo ({product.min_stock}{" "}
                {UNIT_LABELS[product.unit]})
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información del producto</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Unidad</dt>
                <dd className="font-medium">{UNIT_LABELS[product.unit]}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Stock mínimo</dt>
                <dd className="font-medium">{product.min_stock}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Precio compra</dt>
                <dd className="font-medium">
                  {product.purchase_price != null
                    ? formatCLP(product.purchase_price)
                    : "--"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Precio venta</dt>
                <dd className="font-medium">
                  {product.sale_price != null
                    ? formatCLP(product.sale_price)
                    : "--"}
                </dd>
              </div>
            </dl>
            {product.description && (
              <>
                <Separator className="my-3" />
                <p className="text-sm text-muted-foreground">
                  {product.description}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownUp className="size-4" />
            Historial de movimientos
            <Badge variant="secondary">{product.movements.length}</Badge>
          </CardTitle>
          <CardDescription>
            Ultimos 20 movimientos de stock de este producto.
          </CardDescription>
          <CardAction>
            <Button
              size="sm"
              render={
                <Link
                  href={`/${clinic}/inventory/${productId}/movement`}
                />
              }
            >
              <Plus className="size-4" data-icon="inline-start" />
              Nuevo movimiento
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {product.movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8">
              <p className="text-sm text-muted-foreground">
                No hay movimientos registrados.
              </p>
              <Button
                variant="outline"
                className="mt-3"
                size="sm"
                render={
                  <Link
                    href={`/${clinic}/inventory/${productId}/movement`}
                  />
                }
              >
                <Plus className="size-4" data-icon="inline-start" />
                Registrar primer movimiento
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Razón</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(movement.created_at).toLocaleDateString(
                        "es-MX",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          movement.type === "in"
                            ? "default"
                            : movement.type === "out"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {MOVEMENT_TYPE_LABELS[movement.type as StockMovementType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {movement.type === "in" && "+"}
                      {movement.type === "out" && "-"}
                      {movement.quantity}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {movement.reason
                        ? MOVEMENT_REASON_LABELS[
                            movement.reason as StockMovementReason
                          ]
                        : "--"}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-48 truncate">
                      {movement.notes || "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
