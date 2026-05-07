import { Scissors } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getGroomingClinicDirectory,
  getHubGroomingPets,
} from "../queries";
import { GroomingPetCard } from "../_components/grooming-pet-card";
import { GroomingDirectoryCard } from "../_components/grooming-directory-card";
import { NotLoggedInEmpty } from "../_components/empty-states";

export const dynamic = "force-dynamic";

export default async function BellezaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let pets: Awaited<ReturnType<typeof getHubGroomingPets>> = [];
  if (user) {
    pets = await getHubGroomingPets(supabase);
  }

  const directory = await getGroomingClinicDirectory(supabase);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Scissors className="h-5 w-5" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Belleza
          </p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Peluquería y spa para tu regalón
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
          Mira los servicios anteriores de tu mascota y descubre peluquerías
          PraxisVet cerca de ti para reservar la próxima cita.
        </p>
      </header>

      {!user ? (
        <NotLoggedInEmpty section="la peluquería de tu mascota" />
      ) : pets.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Tus mascotas</h2>
            <p className="text-sm text-muted-foreground">
              Sus servicios de peluquería más recientes.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {pets.map((pet) => (
              <GroomingPetCard key={pet.id} pet={pet} />
            ))}
          </div>
        </section>
      ) : null}

      {directory.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">
              Peluquerías que usan PraxisVet
            </h2>
            <p className="text-sm text-muted-foreground">
              Reserva directo con cualquiera de estas. Tu mascota queda
              registrada después de la primera visita.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {directory.map((clinic) => (
              <GroomingDirectoryCard key={clinic.id} clinic={clinic} />
            ))}
          </div>
        </section>
      )}

      {user && pets.length === 0 && directory.length === 0 && (
        <p className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
          Aún no hay peluquerías PraxisVet en tu zona. Pronto sumamos más.
        </p>
      )}
    </div>
  );
}
