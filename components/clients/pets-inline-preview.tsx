import { PawPrint } from "lucide-react";
import { formatSpecies } from "@/lib/validations/clients";
import type { ClientPetPreview } from "@/app/[clinic]/clients/actions";

interface PetsInlinePreviewProps {
  pets: ClientPetPreview[];
  totalCount: number;
}

export function PetsInlinePreview({
  pets,
  totalCount,
}: PetsInlinePreviewProps) {
  if (pets.length === 0 || totalCount === 0) return null;

  const visible = totalCount > 3 ? pets.slice(0, 2) : pets.slice(0, 3);
  const hiddenCount = Math.max(0, totalCount - visible.length);

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <PawPrint className="size-3 shrink-0" />
      <span className="truncate">
        {visible.map((pet, i) => (
          <span key={pet.id}>
            {i > 0 && " · "}
            <span className="text-foreground/80">{pet.name}</span>
            {pet.species && (
              <span className="text-muted-foreground">
                {" "}
                ({formatSpecies(pet.species)})
              </span>
            )}
          </span>
        ))}
        {hiddenCount > 0 && (
          <span className="text-muted-foreground"> +{hiddenCount}</span>
        )}
      </span>
    </div>
  );
}
