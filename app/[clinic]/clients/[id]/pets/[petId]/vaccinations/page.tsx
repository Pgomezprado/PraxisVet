import Link from "next/link";
import { Plus, ArrowLeft, PawPrint } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VaccinationTable } from "@/components/vaccinations/vaccination-table";
import { getVaccinations } from "./actions";
import type { Pet } from "@/types";

export default async function VaccinationsPage({
  params,
}: {
  params: Promise<{ clinic: string; id: string; petId: string }>;
}) {
  const { clinic, id, petId } = await params;
  const supabase = await createClient();

  const { data: pet } = await supabase
    .from("pets")
    .select("*")
    .eq("id", petId)
    .single();

  if (!pet) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        Mascota no encontrada.
      </div>
    );
  }

  const typedPet = pet as Pet;
  const result = await getVaccinations(petId);

  const basePath = `/${clinic}/clients/${id}/pets/${petId}/vaccinations`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          render={<Link href={`/${clinic}/clients/${id}`} />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold">Carnet de vacunacion</h1>
      </div>

      <div className="flex items-center gap-4 rounded-lg border p-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <PawPrint className="size-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="font-medium">{typedPet.name}</p>
          <p className="text-sm text-muted-foreground">
            {[typedPet.species, typedPet.breed].filter(Boolean).join(" - ")}
            {typedPet.microchip && ` | Microchip: ${typedPet.microchip}`}
          </p>
        </div>
        {!typedPet.active && <Badge variant="destructive">Inactivo</Badge>}
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">Vacunas registradas</h2>
          <p className="text-sm text-muted-foreground">
            Historial completo de vacunacion
          </p>
        </div>
        <Button render={<Link href={`${basePath}/new`} />}>
          <Plus className="size-4" data-icon="inline-start" />
          Registrar vacuna
        </Button>
      </div>

      {!result.success ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Error al cargar las vacunas: {result.error}
        </div>
      ) : (
        <VaccinationTable
          vaccinations={result.data}
          basePath={basePath}
        />
      )}
    </div>
  );
}
