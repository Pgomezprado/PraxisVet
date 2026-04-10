import { getProduct } from "../../actions";
import { ProductForm } from "@/components/inventory/product-form";

export default async function EditProductPage({
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
        <h1 className="text-2xl font-bold tracking-tight">Editar producto</h1>
        <p className="text-muted-foreground">
          Modifica los datos de {result.data.name}.
        </p>
      </div>

      <ProductForm product={result.data} />
    </div>
  );
}
