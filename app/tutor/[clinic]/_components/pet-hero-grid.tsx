import Link from "next/link";
import { PawPrint, ShieldCheck, Syringe } from "lucide-react";
import { formatSpecies } from "@/lib/validations/clients";
import { formatPetAge } from "@/lib/utils/format";
import { RequestAppointmentButton } from "./request-appointment-button";
import type { TutorPet } from "../queries";

type Props = {
  clinicSlug: string;
  pets: TutorPet[];
  /** Set de petIds con alguna alerta de vacunas activa */
  alertPetIds?: Set<string>;
};

export function PetHeroGrid({
  clinicSlug,
  pets,
  alertPetIds,
}: Props) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Tus regalones del día
        </h2>
        <p className="text-xs text-muted-foreground">
          Toca cualquiera para ver su historia.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {pets.map((pet) => (
          <PetCard
            key={pet.id}
            clinicSlug={clinicSlug}
            pet={pet}
            hasAlert={alertPetIds?.has(pet.id) ?? false}
          />
        ))}
      </div>

      <div className="flex justify-center pt-1 sm:justify-start">
        <RequestAppointmentButton
          clinicSlug={clinicSlug}
          pets={pets}
          size="lg"
        />
      </div>
    </section>
  );
}

function PetCard({
  clinicSlug,
  pet,
  hasAlert,
}: {
  clinicSlug: string;
  pet: TutorPet;
  hasAlert: boolean;
}) {
  const age = formatPetAge(pet.birthdate);
  const speciesLabel = pet.species ? formatSpecies(pet.species) : null;
  const subline =
    [speciesLabel, age].filter(Boolean).join(" · ") || pet.breed || null;

  return (
    <Link
      href={`/tutor/${clinicSlug}/pets/${pet.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-primary/5">
        {pet.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pet.photo_url}
            alt={pet.name}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/10">
            <PawPrint className="size-16 text-primary/70" />
          </div>
        )}
        <div className="absolute right-3 top-3">
          {hasAlert ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/90 px-2.5 py-1 text-[11px] font-medium text-amber-800 shadow-sm backdrop-blur">
              <Syringe className="size-3" />
              Vacuna pendiente
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2.5 py-1 text-[11px] font-medium text-emerald-800 shadow-sm backdrop-blur">
              <ShieldCheck className="size-3" />
              Al día
            </span>
          )}
        </div>
      </div>
      <div className="space-y-0.5 p-4">
        <p className="text-xl font-bold tracking-tight">{pet.name}</p>
        {subline && (
          <p className="truncate text-sm text-muted-foreground">{subline}</p>
        )}
      </div>
    </Link>
  );
}
