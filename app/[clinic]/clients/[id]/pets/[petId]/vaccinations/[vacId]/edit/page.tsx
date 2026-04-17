import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { VaccinationForm } from "@/components/vaccinations/vaccination-form";
import { getVaccineCatalogForPet } from "@/lib/vaccines/catalog";
import { getVets } from "../../actions";
import type { Species, Vaccination } from "@/types";

export default async function EditVaccinationPage({
  params,
}: {
  params: Promise<{ clinic: string; id: string; petId: string; vacId: string }>;
}) {
  const { clinic, id, petId, vacId } = await params;
  const supabase = await createClient();

  const { data: vaccination, error } = await supabase
    .from("vaccinations")
    .select("*")
    .eq("id", vacId)
    .single();

  if (error || !vaccination) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        Registro de vacunación no encontrado.
      </div>
    );
  }

  const typedVaccination = vaccination as Vaccination;

  const { data: pet } = await supabase
    .from("pets")
    .select("org_id, name, species")
    .eq("id", petId)
    .single();

  const orgId = pet?.org_id ?? typedVaccination.org_id;
  const vetsResult = await getVets(orgId);
  const vets = vetsResult.success ? vetsResult.data : [];
  const catalog = pet?.species
    ? await getVaccineCatalogForPet(pet.species as Species, orgId)
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
          Editar vacuna - {pet?.name ?? "Mascota"}
        </h1>
      </div>

      <VaccinationForm
        petId={petId}
        clientId={id}
        vaccination={typedVaccination}
        vets={vets}
        catalog={catalog}
        returnPath={returnPath}
      />
    </div>
  );
}
