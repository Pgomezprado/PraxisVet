import { createClient } from "@/lib/supabase/server";
import { PetForm } from "@/components/clients/pet-form";
import { getClient } from "../../../../actions";
import type { Pet } from "@/types";

export default async function EditPetPage({
  params,
}: {
  params: Promise<{ clinic: string; id: string; petId: string }>;
}) {
  const { id, petId } = await params;
  const supabase = await createClient();

  const [{ data: pet, error }, clientResult] = await Promise.all([
    supabase.from("pets").select("*").eq("id", petId).single(),
    getClient(id),
  ]);

  if (error || !pet) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        Mascota no encontrada.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {clientResult.success && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Cliente: {clientResult.data.first_name} {clientResult.data.last_name}
          </p>
        </div>
      )}
      <PetForm clientId={id} pet={pet as Pet} />
    </div>
  );
}
