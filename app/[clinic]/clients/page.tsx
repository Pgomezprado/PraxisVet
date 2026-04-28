import { createClient } from "@/lib/supabase/server";
import { getClients, type ClientsSortKey } from "./actions";
import { ClientsTable } from "@/components/clients/clients-table";

const PAGE_SIZE = 25;

const VALID_SORTS: ReadonlyArray<ClientsSortKey> = [
  "last_name_asc",
  "last_name_desc",
  "created_desc",
  "created_asc",
];

export default async function ClientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string }>;
  searchParams: Promise<{ page?: string; search?: string; sort?: string }>;
}) {
  const { clinic } = await params;
  const { page: pageParam, search, sort: sortParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const sort: ClientsSortKey = VALID_SORTS.includes(sortParam as ClientsSortKey)
    ? (sortParam as ClientsSortKey)
    : "last_name_asc";

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

  const result = await getClients(org.id, {
    page,
    pageSize: PAGE_SIZE,
    search,
    sort,
  });

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona los clientes y sus mascotas.
          </p>
        </div>
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Error al cargar clientes: {result.error}
        </div>
      </div>
    );
  }

  const { data: clients, total } = result.data;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">
          Gestiona los clientes y sus mascotas.
        </p>
      </div>

      <ClientsTable
        clients={clients}
        clinicSlug={clinic}
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
        search={search}
        sort={sort}
      />
    </div>
  );
}
