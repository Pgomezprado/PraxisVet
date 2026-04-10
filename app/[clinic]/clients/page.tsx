import { createClient } from "@/lib/supabase/server";
import { getClients } from "./actions";
import { ClientsTable } from "@/components/clients/clients-table";

export default async function ClientsPage({
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

  const result = await getClients(org.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">
          Gestiona los clientes y sus mascotas.
        </p>
      </div>

      {result.success ? (
        <ClientsTable clients={result.data} clinicSlug={clinic} />
      ) : (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Error al cargar clientes: {result.error}
        </div>
      )}
    </div>
  );
}
