import { ProductForm } from "@/components/inventory/product-form";

export default async function NewProductPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo producto</h1>
        <p className="text-muted-foreground">
          Agrega un nuevo producto al inventario.
        </p>
      </div>

      <ProductForm />
    </div>
  );
}
