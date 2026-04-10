import { getProduct } from "../../actions";
import { MovementForm } from "@/components/inventory/movement-form";

export default async function MovementPage({
  params,
}: {
  params: Promise<{ clinic: string; productId: string }>;
}) {
  const { productId } = await params;

  const result = await getProduct(productId);

  if (!result.success) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {result.error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Movimiento de stock
        </h1>
        <p className="text-muted-foreground">
          Registra un movimiento de stock para {result.data.name}.
        </p>
      </div>

      <MovementForm
        productId={productId}
        productName={result.data.name}
        currentStock={result.data.stock_quantity}
        unit={result.data.unit}
        minStock={result.data.min_stock}
      />
    </div>
  );
}
