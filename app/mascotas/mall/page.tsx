import { ShoppingBag } from "lucide-react";
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
  "Tiendas verificadas que envían a tu casa",
  "Alimento al peso recomendado por tu vet",
  "Filtros por especie, talla y dieta especial",
  "Ofertas exclusivas para tutores PraxisVet",
];

export default async function MallPage() {
  const supabase = await createClient();
  const defaults = await getWaitlistDefaults(supabase);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Mall
          </p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Tiendas, alimento, juguetes y ropa
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
          Estamos sumando tiendas pet-friendly. Comida de calidad, juguetes que
          aguantan, ropa para los días fríos y todo lo que tu mascota necesita.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lo que vas a encontrar</CardTitle>
          <CardDescription>
            Todo en un mismo lugar — sin saltar entre apps de delivery.
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
        section="mall"
        defaultEmail={defaults.email}
        defaultSpecies={defaults.species}
      />
    </div>
  );
}
