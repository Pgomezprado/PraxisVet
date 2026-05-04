import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCustomBreeds } from "./actions";
import { BreedsManager } from "@/components/breeds/breeds-manager";
import { Button } from "@/components/ui/button";

export default async function BreedsSettingsPage({
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
      <div className="text-sm text-destructive">Clínica no encontrada.</div>
    );
  }

  const result = await getCustomBreeds(org.id);

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
          <h1 className="text-2xl font-bold tracking-tight">Razas</h1>
          <p className="text-muted-foreground">
            Agrega razas que no están en el listado por defecto. Aparecerán como
            sugerencias al registrar una mascota.
          </p>
        </div>
      </div>

      {result.success ? (
        <BreedsManager
          orgId={org.id}
          clinicSlug={clinic}
          initialBreeds={result.data}
        />
      ) : (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Error al cargar razas: {result.error}
        </div>
      )}
    </div>
  );
}
