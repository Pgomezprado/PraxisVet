import { createClient } from "@/lib/supabase/server";
import { getProducts, getStockAlerts } from "./actions";
import { ProductsTable } from "@/components/inventory/products-table";

const PAGE_SIZE = 25;

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    category?: string;
  }>;
}) {
  const { clinic } = await params;
  const { page: pageParam, search, category } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

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

  const [result, alertsResult] = await Promise.all([
    getProducts(org.id, { page, pageSize: PAGE_SIZE, search, category }),
    getStockAlerts(org.id),
  ]);

  const alertCount = alertsResult.success ? alertsResult.data.length : 0;

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
          <p className="text-muted-foreground">
            Gestiona los productos y el stock de tu clínica.
          </p>
        </div>
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Error al cargar productos: {result.error}
        </div>
      </div>
    );
  }

  const { data: products, total } = result.data;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
        <p className="text-muted-foreground">
          Gestiona los productos y el stock de tu clínica.
        </p>
      </div>

      <ProductsTable
        products={products}
        clinicSlug={clinic}
        alertCount={alertCount}
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
        search={search}
        category={category}
      />
    </div>
  );
}
