import Link from "next/link";
import {
  Heart,
  Scissors,
  Users,
  ShoppingBag,
  Plane,
  ShieldCheck,
  ArrowRight,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getHubPets } from "./queries";
import { HeroPetCard } from "./_components/hero-pet-card";
import { AddFirstPetForm } from "./_components/add-first-pet-form";
import { ShareCard } from "./_components/share-card";

export const dynamic = "force-dynamic";

const sections = [
  {
    title: "Salud",
    href: "/mascotas/salud",
    icon: Heart,
    description: "La ficha clínica, vacunas y vet.",
    status: "live" as const,
  },
  {
    title: "Belleza",
    href: "/mascotas/belleza",
    icon: Scissors,
    description: "Peluquerías y spa cerca de ti.",
    status: "live" as const,
  },
  {
    title: "Comunidad",
    href: "/mascotas/comunidad",
    icon: Users,
    description: "Conoce otros regalones y comparte momentos.",
    status: "soon" as const,
  },
  {
    title: "Mall",
    href: "/mascotas/mall",
    icon: ShoppingBag,
    description: "Tiendas, alimentos, juguetes y ropa.",
    status: "soon" as const,
  },
  {
    title: "Viajes",
    href: "/mascotas/viajes",
    icon: Plane,
    description: "Hoteles pet-friendly, aerolíneas y sitters.",
    status: "soon" as const,
  },
  {
    title: "Protección",
    href: "/mascotas/proteccion",
    icon: ShieldCheck,
    description: "Seguros para que tu mascota esté tranquila.",
    status: "soon" as const,
  },
];

export default async function MascotasHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let pets: Awaited<ReturnType<typeof getHubPets>> = [];
  let tutorFirstName: string | null = null;

  if (user) {
    const [petsRes, linkRes] = await Promise.all([
      getHubPets(supabase),
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

  const tagline =
    pets.length === 0
      ? "Salud, belleza, compras, viajes y protección. Todo lo de tu mascota en un solo lugar."
      : pets.length === 1
        ? `Aquí está todo lo de ${pets[0]?.name}.`
        : "Aquí están tus regalones.";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Tu manada
        </p>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {tutorFirstName ? `Hola, ${tutorFirstName}` : "Todo lo de tu mascota, en un mismo lugar"}
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
          {tagline}
        </p>
      </header>

      {user && pets.length > 0 && (
        <>
          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xl font-semibold">
                {pets.length === 1 ? "Tu regalón" : "Tus regalones"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/mascotas/agregar" />}
              >
                <Plus className="h-4 w-4" />
                Agregar otra
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pets.map((pet) => (
                <HeroPetCard key={pet.id} pet={pet} />
              ))}
            </div>
          </section>

          <ShareCard
            variant="both"
            petName={pets.length === 1 ? pets[0].name : null}
          />
        </>
      )}

      {user && pets.length === 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Empecemos por tu mascota</h2>
            <p className="text-sm text-muted-foreground">
              Cuéntanos lo básico y construyamos su perfil juntos.
            </p>
          </div>
          <AddFirstPetForm tutorFirstName={tutorFirstName} />
        </section>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Explora el hub</h2>
          <p className="text-sm text-muted-foreground">
            Cinco secciones pensadas para tu regalón.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon;
            const isSoon = section.status === "soon";

            const inner = (
              <Card
                className={`h-full transition-all ${
                  isSoon
                    ? "opacity-70"
                    : "group-hover:-translate-y-0.5 group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-ring"
                }`}
              >
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {section.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {isSoon ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Pronto
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Entrar
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  )}
                </CardContent>
              </Card>
            );

            if (isSoon) {
              return (
                <div key={section.href} aria-disabled="true">
                  {inner}
                </div>
              );
            }

            return (
              <Link
                key={section.href}
                href={section.href}
                className="group focus:outline-none"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
