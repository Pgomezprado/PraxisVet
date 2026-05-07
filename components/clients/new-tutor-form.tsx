"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  newTutorWithPetSchema,
  type NewTutorWithPetInput,
  SPECIES_OPTIONS,
  SEX_OPTIONS,
  getReproductiveStatusOptions,
} from "@/lib/validations/clients";
import { SIZE_OPTIONS } from "@/lib/validations/services";
import { mergeBreedSuggestions } from "@/lib/constants/breeds";
import { useClinic } from "@/lib/context/clinic-context";
import { createTutorWithPet } from "@/app/[clinic]/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, User, PawPrint } from "lucide-react";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

interface NewTutorFormProps {
  /** Razas personalizadas de la clínica, agrupadas por especie. */
  customBreeds?: Record<string, string[]>;
}

export function NewTutorForm({ customBreeds }: NewTutorFormProps = {}) {
  const router = useRouter();
  const { organization, clinicSlug } = useClinic();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<NewTutorWithPetInput>({
    resolver: zodResolver(newTutorWithPetSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      rut: "",
      email: "",
      phone: "",
      address: "",
      pet_name: "",
      pet_species: "",
      pet_breed: "",
      pet_color: "",
      pet_sex: "",
      pet_birthdate: "",
      pet_microchip: "",
      pet_reproductive_status: "",
      pet_size: "",
      pet_notes: "",
      whatsapp_opt_in: false,
    },
  });

  const watchedSpecies = watch("pet_species");
  const watchedSex = watch("pet_sex");
  const watchedPhone = watch("phone");
  const phoneFilled = !!watchedPhone && watchedPhone.replace(/[^0-9]/g, "").length >= 9;
  const breedSuggestions = mergeBreedSuggestions(watchedSpecies, customBreeds);
  const reproductiveOptions = getReproductiveStatusOptions(watchedSex);

  async function onSubmit(data: NewTutorWithPetInput) {
    setError(null);
    setLoading(true);

    const result = await createTutorWithPet(organization.id, clinicSlug, data);

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push(`/${clinicSlug}/clients/${result.data.clientId}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Sección 1: Tutor */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <User className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Datos del tutor
              </CardTitle>
              <CardDescription>
                Persona responsable de la mascota.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="first_name">Nombre *</Label>
              <Input
                id="first_name"
                placeholder="ej: María"
                {...register("first_name")}
                aria-invalid={!!errors.first_name}
              />
              <FieldError message={errors.first_name?.message} />
            </div>
            <div>
              <Label htmlFor="last_name">Apellido *</Label>
              <Input
                id="last_name"
                placeholder="ej: Pérez"
                {...register("last_name")}
                aria-invalid={!!errors.last_name}
              />
              <FieldError message={errors.last_name?.message} />
            </div>
          </div>

          <div>
            <Label htmlFor="rut">RUT (opcional)</Label>
            <Input
              id="rut"
              placeholder="ej: 12.345.678-9"
              {...register("rut")}
              aria-invalid={!!errors.rut}
            />
            <FieldError message={errors.rut?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="ej: maria@email.com"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              <FieldError message={errors.email?.message} />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input
                id="phone"
                placeholder="ej: +56 9 1234 5678"
                {...register("phone")}
              />
            </div>
          </div>

          <div>
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
                      ? "El tutor autoriza recibir confirmaciones de cita y recordatorios."
                      : "Ingresa primero el teléfono para activar esta opción."}
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

        </CardContent>
      </Card>

      {/* Sección 2: Paciente */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <PawPrint className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Datos del paciente
              </CardTitle>
              <CardDescription>
                La mascota del tutor. Podrás agregar más pacientes después.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="pet_name">Nombre del paciente *</Label>
            <Input
              id="pet_name"
              placeholder="ej: Luna"
              {...register("pet_name")}
              aria-invalid={!!errors.pet_name}
            />
            <FieldError message={errors.pet_name?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pet_species">Especie (opcional)</Label>
              <Select id="pet_species" {...register("pet_species")}>
                <option value="">Seleccionar especie</option>
                {SPECIES_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="pet_breed">Raza (opcional)</Label>
              <Controller
                name="pet_breed"
                control={control}
                render={({ field }) => (
                  <Combobox
                    id="pet_breed"
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
              <Label htmlFor="pet_sex">Sexo (opcional)</Label>
              <Select id="pet_sex" {...register("pet_sex")}>
                <option value="">Seleccionar sexo</option>
                {SEX_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="pet_reproductive_status">
                Estado reproductivo (opcional)
              </Label>
              <Select
                id="pet_reproductive_status"
                {...register("pet_reproductive_status")}
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
              <Label htmlFor="pet_birthdate">Fecha de nacimiento (opcional)</Label>
              <Controller
                name="pet_birthdate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    id="pet_birthdate"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Seleccionar fecha"
                  />
                )}
              />
            </div>
            <div>
              <Label htmlFor="pet_color">Color (opcional)</Label>
              <Input
                id="pet_color"
                placeholder="ej: Dorado"
                {...register("pet_color")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pet_size">Talla (opcional)</Label>
              <Select id="pet_size" {...register("pet_size")}>
                <option value="">Seleccionar talla</option>
                {SIZE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Usado para tarifas de peluquería.
              </p>
            </div>
            <div>
              <Label htmlFor="pet_microchip">Microchip (opcional)</Label>
              <Input
                id="pet_microchip"
                placeholder="ej: 985112345678901"
                {...register("pet_microchip")}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="pet_notes">Notas del paciente (opcional)</Label>
            <Textarea
              id="pet_notes"
              placeholder="Alergias, temperamento, observaciones…"
              rows={2}
              {...register("pet_notes")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="size-3.5 animate-spin" />}
          Crear tutor y paciente
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${clinicSlug}/clients`)}
          disabled={loading}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
