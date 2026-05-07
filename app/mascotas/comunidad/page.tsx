import { Users, Camera, Heart, MessageCircle } from "lucide-react";
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

export default async function ComunidadPage() {
  const supabase = await createClient();
  const defaults = await getWaitlistDefaults(supabase);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Comunidad
          </p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          La comunidad de tu regalón está en camino
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
          Pronto vas a poder seguir a otros regalones, compartir sus mejores
          momentos y descubrir mascotas como la tuya en tu barrio.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Camera className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-base">Comparte sus momentos</CardTitle>
              <CardDescription>
                Sube fotos de paseos, cumpleaños, peluquería y momentos
                graciosos.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Heart className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-base">Sigue regalones</CardTitle>
              <CardDescription>
                Encuentra mascotas de tu raza, edad o barrio para conectar con
                sus tutores.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-base">Conversa y consulta</CardTitle>
              <CardDescription>
                Haz preguntas a otros tutores: alimento, paseadores, cuidados,
                tips entre conocidos.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-base">Eventos y encuentros</CardTitle>
              <CardDescription>
                Quedadas en plazas, paseos grupales, cumpleaños — todo lo que
                pasa offline en un solo lugar.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>

      <WaitlistForm
        section="comunidad"
        defaultEmail={defaults.email}
        defaultSpecies={defaults.species}
      />

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Mientras tanto, sigue armando el perfil de tu mascota en{" "}
            <span className="font-medium text-foreground">Salud</span> — esos
            datos serán parte de su tarjeta cuando lance la comunidad.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
