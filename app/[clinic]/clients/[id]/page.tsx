import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  Pencil,
  Plus,
  PawPrint,
  StickyNote,
} from "lucide-react";
import { getClient } from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ClientDetailActions } from "./_components/client-detail-actions";
import { PetCard } from "./_components/pet-card";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clinic: string; id: string }>;
}) {
  const { clinic, id } = await params;

  const result = await getClient(id);

  if (!result.success) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {result.error}
      </div>
    );
  }

  const client = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {client.first_name} {client.last_name}
          </h1>
          <p className="text-muted-foreground">
            Cliente registrado el{" "}
            {new Date(client.created_at).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/${clinic}/clients/${id}/edit`} />}
          >
            <Pencil className="size-4" data-icon="inline-start" />
            Editar
          </Button>
          <ClientDetailActions clientId={id} clinicSlug={clinic} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informaci\u00f3n de contacto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="size-4 text-muted-foreground" />
              <span>{client.email || "Sin email"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="size-4 text-muted-foreground" />
              <span>{client.phone || "Sin tel\u00e9fono"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="size-4 text-muted-foreground" />
              <span>{client.address || "Sin direcci\u00f3n"}</span>
            </div>
          </div>
          {client.notes && (
            <>
              <Separator className="my-4" />
              <div className="flex items-start gap-2 text-sm">
                <StickyNote className="mt-0.5 size-4 text-muted-foreground" />
                <p className="text-muted-foreground">{client.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PawPrint className="size-4" />
            Mascotas
            <Badge variant="secondary">{client.pets.length}</Badge>
          </CardTitle>
          <CardDescription>
            Mascotas registradas de este cliente.
          </CardDescription>
          <CardAction>
            <Button
              size="sm"
              render={<Link href={`/${clinic}/clients/${id}/pets/new`} />}
            >
              <Plus className="size-4" data-icon="inline-start" />
              Agregar mascota
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {client.pets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8">
              <p className="text-sm text-muted-foreground">
                Este cliente no tiene mascotas registradas.
              </p>
              <Button
                variant="outline"
                className="mt-3"
                size="sm"
                render={<Link href={`/${clinic}/clients/${id}/pets/new`} />}
              >
                <Plus className="size-4" data-icon="inline-start" />
                Registrar primera mascota
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {client.pets.map((pet) => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  clientId={id}
                  clinicSlug={clinic}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
