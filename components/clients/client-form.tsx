"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
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
    control,
    formState: { errors },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      first_name: client?.first_name ?? "",
      last_name: client?.last_name ?? "",
      rut: client?.rut ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      address: client?.address ?? "",
      whatsapp_opt_in: client?.whatsapp_opt_in ?? false,
    },
  });

  const phoneValue = useWatch({ control, name: "phone" });
  const phoneFilled = !!phoneValue && phoneValue.replace(/[^0-9]/g, "").length >= 9;

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

          <div className="space-y-2">
            <Label htmlFor="rut">RUT (opcional)</Label>
            <Input
              id="rut"
              placeholder="ej: 12.345.678-9"
              {...register("rut")}
            />
            {errors.rut && (
              <p className="text-sm text-destructive">{errors.rut.message}</p>
            )}
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
                placeholder="ej: +56 9 1234 5678"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">
                  {errors.phone.message}
                </p>
              )}
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

          <Controller
            control={control}
            name="whatsapp_opt_in"
            render={({ field }) => (
              <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/30 p-4">
                <div className="space-y-1">
                  <Label className="text-base">
                    Acepta recibir WhatsApp
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {phoneFilled
                      ? "El tutor autoriza recibir confirmaciones de cita y recordatorios al teléfono ingresado."
                      : "Ingresa primero el teléfono del tutor para activar esta opción."}
                  </p>
                </div>
                <Switch
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                  disabled={!phoneFilled || loading}
                />
              </div>
            )}
          />

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
