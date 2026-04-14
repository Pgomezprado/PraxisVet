"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  petSchema,
  type PetInput,
  SPECIES_OPTIONS,
  SEX_OPTIONS,
} from "@/lib/validations/clients";
import { useClinic } from "@/lib/context/clinic-context";
import { createPet, updatePet } from "@/app/[clinic]/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { Pet } from "@/types";

interface PetFormProps {
  clientId: string;
  pet?: Pet;
}

export function PetForm({ clientId, pet }: PetFormProps) {
  const router = useRouter();
  const { organization, clinicSlug } = useClinic();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isEditing = !!pet;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PetInput>({
    resolver: zodResolver(petSchema),
    defaultValues: {
      name: pet?.name ?? "",
      species: pet?.species ?? "",
      breed: pet?.breed ?? "",
      color: pet?.color ?? "",
      sex: pet?.sex ?? "",
      birthdate: pet?.birthdate ?? "",
      microchip: pet?.microchip ?? "",
      notes: pet?.notes ?? "",
    },
  });

  async function onSubmit(data: PetInput) {
    setLoading(true);
    setError(null);

    const result = isEditing
      ? await updatePet(organization.id, pet!.id, clientId, clinicSlug, data)
      : await createPet(organization.id, clientId, clinicSlug, data);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/${clinicSlug}/clients/${clientId}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? "Editar mascota" : "Nueva mascota"}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? "Modifica los datos de la mascota."
            : "Registra una nueva mascota para este cliente."}
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
            <Label htmlFor="name">Nombre de la mascota</Label>
            <Input
              id="name"
              placeholder="ej: Max"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="species">Especie (opcional)</Label>
              <Select id="species" {...register("species")}>
                <option value="">Seleccionar especie</option>
                {SPECIES_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="breed">Raza (opcional)</Label>
              <Input
                id="breed"
                placeholder="ej: Labrador"
                {...register("breed")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="color">Color (opcional)</Label>
              <Input
                id="color"
                placeholder="ej: Dorado"
                {...register("color")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sex">Sexo (opcional)</Label>
              <Select id="sex" {...register("sex")}>
                <option value="">Seleccionar sexo</option>
                {SEX_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthdate">Fecha de nacimiento (opcional)</Label>
              <Input
                id="birthdate"
                type="date"
                {...register("birthdate")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="microchip">Microchip (opcional)</Label>
            <Input
              id="microchip"
              placeholder="ej: 985112345678901"
              {...register("microchip")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Alergias, condiciones especiales..."
              {...register("notes")}
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
                  : "Agregar mascota"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(`/${clinicSlug}/clients/${clientId}`)
              }
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
