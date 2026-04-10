import { createClient } from "@/lib/supabase/server";
import { getProducts } from "./actions";
import { ProductsTable } from "@/components/inventory/products-table";

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ clinic: string }>;
}) {
  const { clinic } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", clinic)
    .single();

  if (!org) {
    return (
      <div className="text-sm text-destructive">Clinica no encontrada.</div>
    );
  }

  const result = await getProducts(org.id);

  const alertCount = result.success
    ? result.data.filter((p) => p.active && p.low_stock).length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
        <p className="text-muted-foreground">
          Gestiona los productos y el stock de tu clinica.
        </p>
      </div>

      {result.success ? (
        <ProductsTable
          products={result.data}
          clinicSlug={clinic}
          alertCount={alertCount}
        />
      ) : (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Error al cargar productos: {result.error}
        </div>
      )}
    </div>
  );
}
