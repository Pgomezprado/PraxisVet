import { ShieldCheck } from "lucide-react";
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
  "Coberturas adaptadas a la edad y especie de tu mascota",
  "Reembolso ágil cuando tu vet emite la cuenta",
  "Comparador para elegir el plan que más te conviene",
  "Asesoría humana para entender qué cubre cada uno",
];

export default async function ProteccionPage() {
  const supabase = await createClient();
  const defaults = await getWaitlistDefaults(supabase);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Protección
          </p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Seguros para que viva tranquila
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
          Estamos cerrando alianzas con aseguradoras especializadas en
          mascotas. Coberturas claras, sin letra chica y a precios justos.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lo que vas a encontrar</CardTitle>
          <CardDescription>
            Comparar y contratar sin papeleo ni teléfonos eternos.
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
        section="proteccion"
        defaultEmail={defaults.email}
        defaultSpecies={defaults.species}
      />
    </div>
  );
}
