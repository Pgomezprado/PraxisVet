import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getServices } from "./actions";
import { ServicesTable } from "@/components/services/services-table";
import { Button } from "@/components/ui/button";

export default async function ServicesPage({
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

  const result = await getServices(org.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/${clinic}/settings`} />}
        >
          <ArrowLeft className="size-4" />
          <span className="sr-only">Volver</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Servicios</h1>
          <p className="text-muted-foreground">
            Gestiona el catálogo de servicios de tu clínica.
          </p>
        </div>
      </div>

      {result.success ? (
        <ServicesTable services={result.data} clinicSlug={clinic} />
      ) : (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Error al cargar servicios: {result.error}
        </div>
      )}
    </div>
  );
}
