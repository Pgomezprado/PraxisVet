import Image from "next/image";
import Link from "next/link";
import { Plus, ArrowLeft, PawPrint, Scissors } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, canViewGrooming } from "@/lib/auth/current-member";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getGroomingRecords } from "./actions";
import type { Pet } from "@/types";

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function GroomingPage({
  params,
}: {
  params: Promise<{ clinic: string; id: string; petId: string }>;
}) {
  const { clinic, id, petId } = await params;

  const member = await getCurrentMember(clinic);
  if (!member || !canViewGrooming(member.role)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: pet } = await supabase
    .from("pets")
    .select("*")
    .eq("id", petId)
    .single();

  if (!pet) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        Mascota no encontrada.
      </div>
    );
  }

  const typedPet = pet as Pet;
  const result = await getGroomingRecords(petId);
  const basePath = `/${clinic}/clients/${id}/pets/${petId}/grooming`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          render={<Link href={`/${clinic}/clients/${id}`} />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold">Historial de peluquería</h1>
      </div>

      <div className="flex items-center gap-4 rounded-lg border p-4">
        {typedPet.photo_url ? (
          <div className="relative size-14 shrink-0 overflow-hidden rounded-full border">
            <Image
              src={typedPet.photo_url}
              alt={typedPet.name}
              fill
              sizes="56px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted">
            <PawPrint className="size-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1">
          <p className="font-medium">{typedPet.name}</p>
          <p className="text-sm text-muted-foreground">
            {[typedPet.species, typedPet.breed].filter(Boolean).join(" - ")}
          </p>
        </div>
        {!typedPet.active && <Badge variant="destructive">Inactivo</Badge>}
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">Sesiones registradas</h2>
          <p className="text-sm text-muted-foreground">
            Servicios de peluquería realizados
          </p>
        </div>
        <Button render={<Link href={`${basePath}/new`} />}>
          <Plus className="size-4" data-icon="inline-start" />
          Nueva sesión
        </Button>
      </div>

      {!result.success ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Error al cargar las sesiones: {result.error}
        </div>
      ) : result.data.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aún no hay sesiones de peluquería registradas para {typedPet.name}.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {result.data.map((r) => {
            const groomerName = [r.groomer?.first_name, r.groomer?.last_name]
              .filter(Boolean)
              .join(" ");
            return (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Scissors className="size-4 text-muted-foreground" />
                      {r.service_performed ?? "Sesión de peluquería"}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.date)}
                      {groomerName && ` · ${groomerName}`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`${basePath}/${r.id}`} />}
                  >
                    Ver detalle
                  </Button>
                </CardHeader>
                {r.observations && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {r.observations}
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
