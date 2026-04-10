"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceSchema, type ServiceInput } from "@/lib/validations/services";
import { useClinic } from "@/lib/context/clinic-context";
import {
  createService,
  updateService,
} from "@/app/[clinic]/settings/services/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { categoryOptions } from "@/components/services/category-labels";
import type { Service } from "@/types";

interface ServiceFormProps {
  service?: Service;
}

export function ServiceForm({ service }: ServiceFormProps) {
  const router = useRouter();
  const { organization, clinicSlug } = useClinic();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isEditing = !!service;

  const {
    register,
    handleSubmit,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema) as any,
    defaultValues: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      category: service?.category ?? undefined,
      duration_minutes: service?.duration_minutes ?? 30,
      price: service?.price ?? undefined,
      active: service?.active ?? true,
    },
  });

  async function onSubmit(data: ServiceInput) {
    setLoading(true);
    setError(null);

    const result = isEditing
      ? await updateService(service!.id, clinicSlug, data)
      : await createService(organization.id, clinicSlug, data);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/${clinicSlug}/settings/services`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? "Editar servicio" : "Nuevo servicio"}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? "Modifica los datos del servicio."
            : "Agrega un nuevo servicio a tu cat\u00e1logo."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              placeholder="ej: Consulta general"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripci\u00f3n (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Describe brevemente el servicio..."
              {...register("description")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Categor\u00eda (opcional)</Label>
              <Select
                id="category"
                defaultValue={service?.category ?? ""}
                {...register("category")}
              >
                <option value="">Seleccionar categor\u00eda</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">
                  {errors.category.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duraci\u00f3n (minutos)</Label>
              <Input
                id="duration_minutes"
                type="number"
                min={5}
                placeholder="30"
                {...register("duration_minutes", { valueAsNumber: true })}
              />
              {errors.duration_minutes && (
                <p className="text-sm text-destructive">
                  {errors.duration_minutes.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Precio (opcional)</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  {...register("price", { valueAsNumber: true })}
                />
              </div>
              {errors.price && (
                <p className="text-sm text-destructive">
                  {errors.price.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading
                ? isEditing
                  ? "Guardando..."
                  : "Creando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Crear servicio"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${clinicSlug}/settings/services`)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
