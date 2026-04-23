"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  vaccinationSchema,
  type VaccinationInput,
} from "@/lib/validations/vaccinations";
import type { CatalogVaccineGroup } from "@/lib/vaccines/catalog";
import { useClinic } from "@/lib/context/clinic-context";
import {
  createVaccination,
  updateVaccination,
} from "@/app/[clinic]/clients/[id]/pets/[petId]/vaccinations/actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
  catalog: CatalogVaccineGroup[];
  returnPath: string;
  /**
   * Valores iniciales opcionales para prellenar el formulario cuando se abre
   * desde la consulta clínica (clinical_record_id, vet_id, fecha...).
   */
  defaultValues?: {
    clinical_record_id?: string;
    date_administered?: string;
    vet_id?: string;
  };
  /**
   * Si está definido, se llama después de guardar con éxito en lugar de
   * redireccionar a `returnPath`. Útil para cerrar un Sheet inline.
   */
  onSuccess?: () => void;
}

const FREE_DOSE_VALUE = "__free__";

// Valor compuesto: `${vaccineId}:${protocolId}:${doseId}`
function buildDoseValue(
  vaccineId: string,
  protocolId: string,
  doseId: string
): string {
  return `${vaccineId}:${protocolId}:${doseId}`;
}

function parseDoseValue(value: string): {
  vaccineId: string;
  protocolId: string;
  doseId: string;
} | null {
  if (!value || value === FREE_DOSE_VALUE) return null;
  const parts = value.split(":");
  if (parts.length !== 3) return null;
  return { vaccineId: parts[0], protocolId: parts[1], doseId: parts[2] };
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function VaccinationForm({
  petId,
  clientId: _clientId,
  vaccination,
  vets,
  catalog,
  returnPath,
  defaultValues,
  onSuccess,
}: VaccinationFormProps) {
  const router = useRouter();
  const { organization } = useClinic();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const isEditing = !!vaccination;

  // Si la vacuna ya tiene dose_id vinculada, partimos con ese valor seleccionado.
  const initialDoseValue = vaccination?.dose_id
    ? (() => {
        for (const v of catalog) {
          for (const p of v.protocols) {
            const match = p.doses.find((d) => d.doseId === vaccination.dose_id);
            if (match) return buildDoseValue(v.vaccineId, p.protocolId, match.doseId);
          }
        }
        return FREE_DOSE_VALUE;
      })()
    : FREE_DOSE_VALUE;

  const [selectedDose, setSelectedDose] = useState<string>(initialDoseValue);

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
      date_administered:
        vaccination?.date_administered ??
        defaultValues?.date_administered ??
        new Date().toISOString().split("T")[0],
      next_due_date: vaccination?.next_due_date ?? "",
      vet_id: vaccination?.vet_id ?? defaultValues?.vet_id ?? "",
      notes: vaccination?.notes ?? "",
      pet_id: petId,
      clinical_record_id:
        vaccination?.clinical_record_id ??
        defaultValues?.clinical_record_id ??
        "",
      vaccine_catalog_id: vaccination?.vaccine_catalog_id ?? "",
      protocol_id: vaccination?.protocol_id ?? "",
      dose_id: vaccination?.dose_id ?? "",
    },
  });

  const dateAdministered = watch("date_administered");
  const nextDueDate = watch("next_due_date");
  const isFromCatalog = selectedDose !== FREE_DOSE_VALUE;

  // Índice rápido de dosis seleccionada
  const selectedMeta = useMemo(() => {
    const parsed = parseDoseValue(selectedDose);
    if (!parsed) return null;
    const v = catalog.find((c) => c.vaccineId === parsed.vaccineId);
    const p = v?.protocols.find((p) => p.protocolId === parsed.protocolId);
    const d = p?.doses.find((d) => d.doseId === parsed.doseId);
    if (!v || !p || !d) return null;
    return { vaccine: v, protocol: p, dose: d };
  }, [selectedDose, catalog]);

  function handleDoseChange(value: string) {
    setSelectedDose(value);
    const parsed = parseDoseValue(value);
    if (!parsed) {
      // dosis libre: limpiar ids pero dejar textos
      setValue("vaccine_catalog_id", "");
      setValue("protocol_id", "");
      setValue("dose_id", "");
      return;
    }
    const v = catalog.find((c) => c.vaccineId === parsed.vaccineId);
    const p = v?.protocols.find((pp) => pp.protocolId === parsed.protocolId);
    const d = p?.doses.find((dd) => dd.doseId === parsed.doseId);
    if (!v || !p || !d) return;

    setValue("vaccine_catalog_id", v.vaccineId, { shouldValidate: true });
    setValue("protocol_id", p.protocolId, { shouldValidate: true });
    setValue("dose_id", d.doseId, { shouldValidate: true });
    // prellenar nombre visible
    setValue("vaccine_name", `${v.vaccineName} - ${d.doseName}`, {
      shouldValidate: true,
    });
    // preview de next_due_date si hay fecha
    if (dateAdministered) {
      setValue("next_due_date", addDays(dateAdministered, d.intervalDays));
    }
  }

  // Recalcula preview si cambia fecha con dosis del catálogo seleccionada
  function handleDateChange(value: string) {
    setValue("date_administered", value, { shouldValidate: true });
    if (selectedMeta && value) {
      setValue(
        "next_due_date",
        addDays(value, selectedMeta.dose.intervalDays)
      );
    }
  }

  async function onSubmit(data: VaccinationInput) {
    if (isPending) return;
    setError(null);
    setIsPending(true);

    const result = isEditing
      ? await updateVaccination(vaccination!.id, data, returnPath)
      : await createVaccination(organization.id, data, returnPath);

    if (!result.success) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    if (onSuccess) {
      onSuccess();
      router.refresh();
      return;
    }

    router.replace(returnPath);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? "Editar vacuna" : "Registrar vacuna"}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? "Modifica los datos del registro de vacunación."
            : "Selecciona una dosis del catálogo o registra una aplicación libre."}
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
          <input type="hidden" {...register("vaccine_catalog_id")} />
          <input type="hidden" {...register("protocol_id")} />
          <input type="hidden" {...register("dose_id")} />

          {/* Selector de catálogo agrupado */}
          <div className="space-y-2">
            <Label htmlFor="catalog_dose">Vacuna / dosis</Label>
            <Select
              id="catalog_dose"
              value={selectedDose}
              onChange={(e) => handleDoseChange(e.target.value)}
            >
              {catalog.length === 0 && (
                <option value={FREE_DOSE_VALUE}>
                  Sin catálogo disponible - dosis libre
                </option>
              )}
              {catalog.map((v) => (
                <optgroup key={v.vaccineId} label={v.vaccineName}>
                  {v.protocols.flatMap((p) =>
                    p.doses.map((d) => (
                      <option
                        key={d.doseId}
                        value={buildDoseValue(v.vaccineId, p.protocolId, d.doseId)}
                      >
                        {p.protocolName} · {d.doseName} ({d.intervalDays} días)
                      </option>
                    ))
                  )}
                </optgroup>
              ))}
              <optgroup label="Otros">
                <option value={FREE_DOSE_VALUE}>
                  Dosis libre (sin protocolo)
                </option>
              </optgroup>
            </Select>
            {selectedMeta && (
              <p className="text-xs text-muted-foreground">
                {selectedMeta.vaccine.vaccineName} →{" "}
                {selectedMeta.protocol.protocolName} → {selectedMeta.dose.doseName} ·
                próxima dosis a {selectedMeta.dose.intervalDays} días.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vaccine_name">Nombre de la vacuna</Label>
            <Input
              id="vaccine_name"
              placeholder="ej: Óctuple Canina - 1era Puppy"
              readOnly={isFromCatalog}
              {...register("vaccine_name")}
            />
            {isFromCatalog && (
              <p className="text-xs text-muted-foreground">
                Autocompletado desde el catálogo. Para editar, selecciona &quot;Dosis libre&quot;.
              </p>
            )}
            {errors.vaccine_name && (
              <p className="text-sm text-destructive">
                {errors.vaccine_name.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date_administered">Fecha de aplicación</Label>
              <DatePicker
                id="date_administered"
                value={dateAdministered ?? ""}
                onChange={handleDateChange}
                aria-invalid={!!errors.date_administered}
              />
              {errors.date_administered && (
                <p className="text-sm text-destructive">
                  {errors.date_administered.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_due_date">
                Próxima dosis {isFromCatalog && "(preview automático)"}
              </Label>
              <DatePicker
                id="next_due_date"
                value={nextDueDate ?? ""}
                onChange={(v) =>
                  setValue("next_due_date", v, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />
              {isFromCatalog && (
                <p className="text-xs text-muted-foreground">
                  El sistema recalcula esta fecha al guardar si la dejas como viene.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lot_number">Número de lote (opcional)</Label>
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
            <Button type="submit" disabled={isPending}>
              {isPending
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
