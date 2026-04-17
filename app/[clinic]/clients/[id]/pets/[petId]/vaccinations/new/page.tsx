import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { VaccinationForm } from "@/components/vaccinations/vaccination-form";
import { getVaccineCatalogForPet } from "@/lib/vaccines/catalog";
import type { Species } from "@/types";
import { getVets } from "../actions";

export default async function NewVaccinationPage({
  params,
}: {
  params: Promise<{ clinic: string; id: string; petId: string }>;
}) {
  const { clinic, id, petId } = await params;
  const supabase = await createClient();

  const { data: pet } = await supabase
    .from("pets")
    .select("org_id, name, species")
    .eq("id", petId)
    .single();

  if (!pet) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        Mascota no encontrada.
      </div>
    );
  }

  const vetsResult = await getVets(pet.org_id);
  const vets = vetsResult.success ? vetsResult.data : [];

  const catalog = pet.species
    ? await getVaccineCatalogForPet(pet.species as Species, pet.org_id)
    : [];

  const returnPath = `/${clinic}/clients/${id}/pets/${petId}/vaccinations`;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          render={<Link href={returnPath} />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold">
          Nueva vacuna - {pet.name}
        </h1>
      </div>

      <VaccinationForm
        petId={petId}
        clientId={id}
        vets={vets}
        catalog={catalog}
        returnPath={returnPath}
      />
    </div>
  );
}
