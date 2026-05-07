import { Heart, Plus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { getHubHealthPets } from "../queries";
import { HealthPetCard } from "../_components/health-pet-card";
import { NotLoggedInEmpty } from "../_components/empty-states";
import { AddFirstPetForm } from "../_components/add-first-pet-form";

export const dynamic = "force-dynamic";

export default async function SaludPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let pets: Awaited<ReturnType<typeof getHubHealthPets>> = [];
  let tutorFirstName: string | null = null;

  if (user) {
    const [petsRes, linkRes] = await Promise.all([
      getHubHealthPets(supabase),
      supabase
        .from("client_auth_links")
        .select("clients ( first_name )")
        .eq("user_id", user.id)
        .eq("active", true)
        .not("linked_at", "is", null)
        .maybeSingle(),
    ]);
    pets = petsRes;

    type LinkRow = { clients: { first_name: string | null } | null };
    const link = linkRes.data as unknown as LinkRow | null;
    if (link?.clients?.first_name) {
      tutorFirstName = link.clients.first_name.split(" ")[0] ?? null;
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Heart className="h-5 w-5" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Salud
          </p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          La salud de tu regalón, simple y a mano
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
          Vacunas, desparasitaciones y exámenes. Si tu vet aún no usa
          PraxisVet, puedes registrar tú mismo todo lo importante.
        </p>
      </header>

      {!user ? (
        <NotLoggedInEmpty section="la salud de tu mascota" />
      ) : pets.length === 0 ? (
        <AddFirstPetForm tutorFirstName={tutorFirstName} />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            {pets.map((pet) => (
              <HealthPetCard key={pet.id} pet={pet} />
            ))}
          </section>
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/mascotas/agregar" />}
            >
              <Plus className="h-4 w-4" />
              Agregar otra mascota
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
