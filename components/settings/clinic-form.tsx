"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  clinicSettingsSchema,
  type ClinicSettingsInput,
} from "@/lib/validations/clinic-settings";
import { updateClinicSettings } from "@/app/[clinic]/settings/clinic/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { Organization } from "@/types";

interface ClinicFormProps {
  organization: Organization;
}

export function ClinicForm({ organization }: ClinicFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<ClinicSettingsInput>({
    resolver: zodResolver(clinicSettingsSchema) as any,
    defaultValues: {
      name: organization.name,
      email: organization.email ?? "",
      phone: organization.phone ?? "",
      address: organization.address ?? "",
    },
  });

  async function onSubmit(data: ClinicSettingsInput) {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await updateClinicSettings(
      organization.id,
      organization.slug,
      data
    );

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de la clínica</CardTitle>
        <CardDescription>
          Actualiza el nombre y datos de contacto de tu clínica.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600">
              Cambios guardados correctamente.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la clínica</Label>
            <Input
              id="name"
              placeholder="ej: Clínica Veterinaria San Rafael"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email de contacto</Label>
            <Input
              id="email"
              type="email"
              placeholder="contacto@tuclinica.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+52 55 1234 5678"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Textarea
              id="address"
              placeholder="Calle, colonia, ciudad, estado..."
              rows={3}
              {...register("address")}
            />
            {errors.address && (
              <p className="text-sm text-destructive">
                {errors.address.message}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
