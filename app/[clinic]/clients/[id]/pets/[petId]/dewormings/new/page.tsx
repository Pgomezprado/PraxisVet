import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { DewormingForm } from "@/components/dewormings/deworming-form";
import { getCurrentMember, canViewClinical } from "@/lib/auth/current-member";
import { getVetsForDewormings } from "../actions";

export default async function NewDewormingPage({
  params,
}: {
  params: Promise<{ clinic: string; id: string; petId: string }>;
}) {
  const { clinic, id, petId } = await params;

  const member = await getCurrentMember(clinic);
  if (!member || !canViewClinical(member.role)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: pet } = await supabase
    .from("pets")
    .select("org_id, name")
    .eq("id", petId)
    .single();

  if (!pet) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        Mascota no encontrada.
      </div>
    );
  }

  const vetsResult = await getVetsForDewormings(pet.org_id);
  const vets = vetsResult.success ? vetsResult.data : [];

  const returnPath = `/${clinic}/clients/${id}/pets/${petId}/dewormings`;

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
          Nueva desparasitación - {pet.name}
        </h1>
      </div>

      <DewormingForm
        petId={petId}
        clientId={id}
        vets={vets}
        returnPath={returnPath}
      />
    </div>
  );
}
