import { Plane } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getWaitlistDefaults } from "../queries";
import { WaitlistForm } from "../_components/waitlist-form";

export const dynamic = "force-dynamic";

const HIGHLIGHTS = [
  "Hoteles pet-friendly verificados por otros tutores",
  "Aerolíneas con políticas claras para mascotas",
  "Pet sitters y cuidadores con reseñas reales",
  "Daycare para días largos de oficina",
];

export default async function ViajesPage() {
  const supabase = await createClient();
  const defaults = await getWaitlistDefaults(supabase);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Plane className="h-5 w-5" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Viajes
          </p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Viaja sin dejar a tu mascota atrás
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
          Hoteles pet-friendly, aerolíneas que aceptan mascotas, sitters de
          confianza y daycare cuando estás fuera. Todo en un lugar.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lo que vas a encontrar</CardTitle>
          <CardDescription>
            Información concreta y partners verificados, no listas de Google.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <WaitlistForm
        section="viajes"
        defaultEmail={defaults.email}
        defaultSpecies={defaults.species}
      />
    </div>
  );
}
