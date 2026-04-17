"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  petSchema,
  type PetInput,
  SPECIES_OPTIONS,
  SEX_OPTIONS,
  getReproductiveStatusOptions,
} from "@/lib/validations/clients";
import { getBreedSuggestions } from "@/lib/constants/breeds";
import { useClinic } from "@/lib/context/clinic-context";
import { createPet, updatePet } from "@/app/[clinic]/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, PawPrint } from "lucide-react";
import type { Pet } from "@/types";

interface PetFormProps {
  clientId: string;
  pet?: Pet;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
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
    watch,
    control,
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
      reproductive_status: pet?.reproductive_status ?? "",
      notes: pet?.notes ?? "",
    },
  });

  const watchedSpecies = watch("species");
  const watchedSex = watch("sex");
  const breedSuggestions = getBreedSuggestions(watchedSpecies);
  const reproductiveOptions = getReproductiveStatusOptions(watchedSex);

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <PawPrint className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                {isEditing ? "Editar paciente" : "Nuevo paciente"}
              </CardTitle>
              <CardDescription>
                {isEditing
                  ? "Modifica los datos del paciente."
                  : "Registra un nuevo paciente para este tutor."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre del paciente *</Label>
            <Input
              id="name"
              placeholder="ej: Luna"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
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
            <div>
              <Label htmlFor="breed">Raza (opcional)</Label>
              <Controller
                name="breed"
                control={control}
                render={({ field }) => (
                  <Combobox
                    id="breed"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={breedSuggestions}
                    placeholder={
                      breedSuggestions.length > 0
                        ? "Escribe o elige de la lista"
                        : "ej: Labrador"
                    }
                  />
                )}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
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
            <div>
              <Label htmlFor="reproductive_status">
                Estado reproductivo (opcional)
              </Label>
              <Select
                id="reproductive_status"
                {...register("reproductive_status")}
                disabled={reproductiveOptions.length === 0}
              >
                <option value="">
                  {reproductiveOptions.length === 0
                    ? "Selecciona sexo primero"
                    : "Seleccionar estado"}
                </option>
                {reproductiveOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="birthdate">Fecha de nacimiento (opcional)</Label>
              <Controller
                name="birthdate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    id="birthdate"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Seleccionar fecha"
                  />
                )}
              />
            </div>
            <div>
              <Label htmlFor="color">Color (opcional)</Label>
              <Input
                id="color"
                placeholder="ej: Dorado"
                {...register("color")}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="microchip">Microchip (opcional)</Label>
            <Input
              id="microchip"
              placeholder="ej: 985112345678901"
              {...register("microchip")}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas del paciente (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Alergias, temperamento, observaciones…"
              rows={2}
              {...register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="size-3.5 animate-spin" />}
          {isEditing ? "Guardar cambios" : "Agregar paciente"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${clinicSlug}/clients/${clientId}`)}
          disabled={loading}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
