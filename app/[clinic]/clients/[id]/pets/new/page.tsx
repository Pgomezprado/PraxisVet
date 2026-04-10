import { getClient } from "../../../actions";
import { PetForm } from "@/components/clients/pet-form";

export default async function NewPetPage({
  params,
}: {
  params: Promise<{ clinic: string; id: string }>;
}) {
  const { id } = await params;

  const result = await getClient(id);

  if (!result.success) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {result.error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Cliente: {result.data.first_name} {result.data.last_name}
        </p>
      </div>
      <PetForm clientId={id} />
    </div>
  );
}
