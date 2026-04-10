"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  vaccinationSchema,
  type VaccinationInput,
  COMMON_VACCINES,
} from "@/lib/validations/vaccinations";
import { useClinic } from "@/lib/context/clinic-context";
import {
  createVaccination,
  updateVaccination,
} from "@/app/[clinic]/clients/[id]/pets/[petId]/vaccinations/actions";
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
import type { Vaccination, OrganizationMember } from "@/types";

interface VaccinationFormProps {
  petId: string;
  clientId: string;
  vaccination?: Vaccination;
  vets: Pick<OrganizationMember, "id" | "first_name" | "last_name">[];
  returnPath: string;
}

export function VaccinationForm({
  petId,
  clientId,
  vaccination,
  vets,
  returnPath,
}: VaccinationFormProps) {
  const router = useRouter();
  const { organization } = useClinic();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const isEditing = !!vaccination;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VaccinationInput>({
    resolver: zodResolver(vaccinationSchema),
    defaultValues: {
      vaccine_name: vaccination?.vaccine_name ?? "",
      lot_number: vaccination?.lot_number ?? "",
      date_administered: vaccination?.date_administered ?? "",
      next_due_date: vaccination?.next_due_date ?? "",
      vet_id: vaccination?.vet_id ?? "",
      notes: vaccination?.notes ?? "",
      pet_id: petId,
      clinical_record_id: vaccination?.clinical_record_id ?? "",
    },
  });

  const vaccineNameValue = watch("vaccine_name");

  const filteredSuggestions = COMMON_VACCINES.filter((v) =>
    v.toLowerCase().includes((vaccineNameValue ?? "").toLowerCase())
  );

  async function onSubmit(data: VaccinationInput) {
    setLoading(true);
    setError(null);

    const result = isEditing
      ? await updateVaccination(vaccination!.id, data)
      : await createVaccination(organization.id, data);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(returnPath);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? "Editar vacuna" : "Registrar vacuna"}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? "Modifica los datos del registro de vacunaci\u00f3n."
            : "Registra una nueva vacuna aplicada."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <input type="hidden" {...register("pet_id")} />
          <input type="hidden" {...register("clinical_record_id")} />

          <div className="space-y-2">
            <Label htmlFor="vaccine_name">Nombre de la vacuna</Label>
            <div className="relative">
              <Input
                id="vaccine_name"
                placeholder="ej: Rabia, Parvovirus..."
                autoComplete="off"
                {...register("vaccine_name")}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
              />
              {showSuggestions && filteredSuggestions.length > 0 && vaccineNameValue && (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                  {filteredSuggestions.map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button"
                        className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setValue("vaccine_name", suggestion, {
                            shouldValidate: true,
                          });
                          setShowSuggestions(false);
                        }}
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {errors.vaccine_name && (
              <p className="text-sm text-destructive">
                {errors.vaccine_name.message}
              </p>
            )}
            {!vaccineNameValue && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {COMMON_VACCINES.slice(0, 6).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() =>
                      setValue("vaccine_name", v, { shouldValidate: true })
                    }
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date_administered">Fecha de aplicaci\u00f3n</Label>
              <Input
                id="date_administered"
                type="date"
                {...register("date_administered")}
              />
              {errors.date_administered && (
                <p className="text-sm text-destructive">
                  {errors.date_administered.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_due_date">
                Pr\u00f3xima dosis (opcional)
              </Label>
              <Input
                id="next_due_date"
                type="date"
                {...register("next_due_date")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lot_number">N\u00famero de lote (opcional)</Label>
              <Input
                id="lot_number"
                placeholder="ej: AB1234"
                {...register("lot_number")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vet_id">Veterinario (opcional)</Label>
              <Select id="vet_id" {...register("vet_id")}>
                <option value="">Seleccionar veterinario</option>
                {vets.map((vet) => (
                  <option key={vet.id} value={vet.id}>
                    {[vet.first_name, vet.last_name].filter(Boolean).join(" ")}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Reacciones, observaciones..."
              {...register("notes")}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading
                ? isEditing
                  ? "Guardando..."
                  : "Registrando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Registrar vacuna"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(returnPath)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
