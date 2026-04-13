"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, type ClientInput } from "@/lib/validations/clients";
import { useClinic } from "@/lib/context/clinic-context";
import {
  createClient,
  updateClient,
} from "@/app/[clinic]/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { Client } from "@/types";

interface ClientFormProps {
  client?: Client;
}

export function ClientForm({ client }: ClientFormProps) {
  const router = useRouter();
  const { organization, clinicSlug } = useClinic();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isEditing = !!client;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      first_name: client?.first_name ?? "",
      last_name: client?.last_name ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      address: client?.address ?? "",
    },
  });

  async function onSubmit(data: ClientInput) {
    setLoading(true);
    setError(null);

    const result = isEditing
      ? await updateClient(client!.id, clinicSlug, data)
      : await createClient(organization.id, clinicSlug, data);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/${clinicSlug}/clients/${result.data.id}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Editar cliente" : "Nuevo cliente"}</CardTitle>
        <CardDescription>
          {isEditing
            ? "Modifica los datos del cliente."
            : "Registra un nuevo cliente en tu clínica."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre</Label>
              <Input
                id="first_name"
                placeholder="ej: Juan"
                {...register("first_name")}
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">
                  {errors.first_name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Apellido</Label>
              <Input
                id="last_name"
                placeholder="ej: Perez"
                {...register("last_name")}
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">
                  {errors.last_name.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="ej: juan@email.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input
                id="phone"
                placeholder="ej: +52 55 1234 5678"
                {...register("phone")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección (opcional)</Label>
            <Input
              id="address"
              placeholder="ej: Av. Providencia 1234, Santiago"
              {...register("address")}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading
                ? isEditing
                  ? "Guardando..."
                  : "Creando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Crear cliente"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${clinicSlug}/clients`)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
