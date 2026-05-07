import Link from "next/link";
import Image from "next/image";
import { PawPrint } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatPetAge } from "@/lib/utils/format";
import { formatSpecies } from "@/lib/validations/clients";
import type { HubPet } from "../queries";

export function HeroPetCard({ pet }: { pet: HubPet }) {
  const age = formatPetAge(pet.birthdate);
  const subtitle = [formatSpecies(pet.species), age]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/mascotas/${pet.id}`}
      className="group block focus:outline-none"
      aria-label={`Abrir ficha de ${pet.name}`}
    >
      <Card className="overflow-hidden p-0 transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <div className="relative aspect-[4/3] w-full bg-primary/10">
          {pet.photo_url ? (
            <Image
              src={pet.photo_url}
              alt={pet.name}
              fill
              sizes="(min-width: 1024px) 280px, (min-width: 768px) 33vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary">
              <PawPrint className="h-12 w-12" />
            </div>
          )}
        </div>
        <div className="space-y-0.5 p-4">
          <h3 className="text-lg font-semibold leading-tight">{pet.name}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}
