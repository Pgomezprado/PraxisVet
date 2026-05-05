import Link from "next/link";
import { PawPrint } from "lucide-react";
import { formatSpecies } from "@/lib/validations/clients";
import { formatPetAge } from "@/lib/utils/format";
import { getPetAgeMicrocopy, getPetMicrocopy } from "@/lib/utils/pet-microcopy";
import { RequestAppointmentButton } from "./request-appointment-button";
import type { TutorPet } from "../queries";

type Props = {
  clinicSlug: string;
  pet: TutorPet;
};

export function PetHeroSingle({ clinicSlug, pet }: Props) {
  const age = formatPetAge(pet.birthdate);
  const speciesLabel = pet.species ? formatSpecies(pet.species) : null;
  const subline =
    [speciesLabel, age, pet.breed].filter(Boolean).join(" · ") || null;
  const microcopy = age
    ? getPetAgeMicrocopy(pet.id, age, pet.sex)
    : getPetMicrocopy(pet.id, pet.sex);

  return (
    <div className="overflow-hidden rounded-2xl border-2 bg-card shadow-sm">
      <div className="flex flex-col items-center gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <Link
          href={`/tutor/${clinicSlug}/pets/${pet.id}`}
          className="group shrink-0"
          aria-label={`Ver historia de ${pet.name}`}
        >
          {pet.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pet.photo_url}
              alt={pet.name}
              className="size-24 rounded-full object-cover ring-4 ring-primary/10 transition group-hover:ring-primary/20 sm:size-40"
            />
          ) : (
            <div className="flex size-24 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/10 transition group-hover:ring-primary/20 sm:size-40">
              <PawPrint className="size-10 text-primary sm:size-16" />
            </div>
          )}
        </Link>

        <div className="flex-1 text-center sm:text-left">
          <Link
            href={`/tutor/${clinicSlug}/pets/${pet.id}`}
            className="inline-block hover:underline"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {pet.name}
            </h2>
          </Link>
          {subline && (
            <p className="mt-1 text-sm text-muted-foreground">{subline}</p>
          )}
          <p className="mt-2 text-base font-medium text-foreground/80">
            {microcopy}
          </p>

          <div className="mt-5 flex justify-center sm:justify-start">
            <RequestAppointmentButton
              clinicSlug={clinicSlug}
              pets={[pet]}
              size="lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
