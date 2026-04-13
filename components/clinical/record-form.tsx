"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  clinicalRecordSchema,
  type ClinicalRecordInput,
} from "@/lib/validations/clinical-records";
import { useClinic } from "@/lib/context/clinic-context";
import {
  createRecord,
  updateRecord,
} from "@/app/[clinic]/clients/[id]/pets/[petId]/records/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { CollapsibleSection } from "@/components/ui/collapsible";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { RECORD_TEMPLATES, type RecordTemplate } from "./record-templates";

interface Vet {
  id: string;
  first_name: string | null;
  last_name: string | null;
  specialty: string | null;
}

interface RecordFormProps {
  petId: string;
  clientId: string;
  vets: Vet[];
  record?: {
    id: string;
    vet_id: string;
    appointment_id: string | null;
    date: string;
    reason: string | null;
    anamnesis: string | null;
    symptoms: string | null;
    diagnosis: string | null;
    treatment: string | null;
    observations: string | null;
    weight: number | null;
    temperature: number | null;
    heart_rate: number | null;
  };
  defaultAppointmentId?: string;
  defaultVetId?: string;
}

export function RecordForm({
  petId,
  clientId,
  vets,
  record,
  defaultAppointmentId,
  defaultVetId,
}: RecordFormProps) {
  const router = useRouter();
  const { organization, clinicSlug } = useClinic();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<RecordTemplate | null>(
    null
  );

  const isEditing = !!record;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ClinicalRecordInput>({
    resolver: zodResolver(clinicalRecordSchema),
    defaultValues: {
      pet_id: petId,
      vet_id: record?.vet_id ?? defaultVetId ?? "",
      appointment_id: record?.appointment_id ?? defaultAppointmentId ?? "",
      date: record?.date ?? new Date().toISOString().split("T")[0],
      reason: record?.reason ?? "",
      anamnesis: record?.anamnesis ?? "",
      symptoms: record?.symptoms ?? "",
      diagnosis: record?.diagnosis ?? "",
      treatment: record?.treatment ?? "",
      observations: record?.observations ?? "",
      weight: record?.weight ?? ("" as unknown as undefined),
      temperature: record?.temperature ?? ("" as unknown as undefined),
      heart_rate: record?.heart_rate ?? ("" as unknown as undefined),
    },
  });

  const watchedValues = watch([
    "reason",
    "anamnesis",
    "symptoms",
    "diagnosis",
    "treatment",
    "observations",
    "weight",
    "temperature",
    "heart_rate",
  ]);

  const [
    reason,
    anamnesis,
    symptoms,
    diagnosis,
    treatment,
    observations,
    weight,
    temperature,
    heartRate,
  ] = watchedValues;

  const hasVitals = !!(weight || temperature || heartRate);
  const hasExam = !!(anamnesis || symptoms);
  const hasDiagTreatment = !!(diagnosis || treatment);
  const hasObservations = !!observations;

  const vitalsPreview = [
    weight ? `${weight} kg` : null,
    temperature ? `${temperature} °C` : null,
    heartRate ? `${heartRate} bpm` : null,
  ]
    .filter(Boolean)
    .join(" / ");

  const applyTemplate = useCallback(
    (template: RecordTemplate) => {
      const current = getValues();
      if (!current.reason) setValue("reason", template.reason);
      if (!current.symptoms) setValue("symptoms", template.symptoms);
      if (!current.diagnosis) setValue("diagnosis", template.diagnosis);
      if (!current.treatment) setValue("treatment", template.treatment);
      if (template.observations && !current.observations) {
        setValue("observations", template.observations);
      }
      setPendingTemplate(null);
    },
    [getValues, setValue]
  );

  async function onSubmit(data: ClinicalRecordInput) {
    setLoading(true);
    setError(null);

    const result = isEditing
      ? await updateRecord(record!.id, clinicSlug, clientId, petId, data)
      : await createRecord(organization.id, clinicSlug, clientId, data);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(
      `/${clinicSlug}/clients/${clientId}/pets/${petId}/records/${result.data.id}`
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? "Editar registro clínico" : "Nuevo registro clínico"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "Modifica la información del registro clínico."
              : "Registra una nueva consulta clínica para esta mascota."}
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
            <input type="hidden" {...register("appointment_id")} />

            {/* Plantillas rapidas */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Plantilla rápida
              </Label>
              <div className="flex flex-wrap gap-2">
                {RECORD_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    type="button"
                    onClick={() => setPendingTemplate(template)}
                    className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Fecha y veterinario */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input id="date" type="date" {...register("date")} />
                {errors.date && (
                  <p className="text-sm text-destructive">
                    {errors.date.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="vet_id">Veterinario</Label>
                <Select id="vet_id" {...register("vet_id")}>
                  <option value="">Seleccionar veterinario</option>
                  {vets.map((vet) => (
                    <option key={vet.id} value={vet.id}>
                      {[vet.first_name, vet.last_name]
                        .filter(Boolean)
                        .join(" ")}
                      {vet.specialty ? ` - ${vet.specialty}` : ""}
                    </option>
                  ))}
                </Select>
                {errors.vet_id && (
                  <p className="text-sm text-destructive">
                    {errors.vet_id.message}
                  </p>
                )}
              </div>
            </div>

            {/* Seccion 1: Motivo de consulta - siempre abierta */}
            <CollapsibleSection title="Motivo de consulta" alwaysOpen hasContent={!!reason} preview={reason || ""}>
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo</Label>
                <AutoTextarea
                  id="reason"
                  placeholder="ej: Control general, vacunación, malestar digestivo..."
                  {...register("reason")}
                />
                {errors.reason && (
                  <p className="text-sm text-destructive">
                    {errors.reason.message}
                  </p>
                )}
              </div>
            </CollapsibleSection>

            {/* Sección 2: Signos vitales - expandida por default */}
            <CollapsibleSection
              title="Signos vitales"
              defaultOpen
              hasContent={hasVitals}
              preview={vitalsPreview}
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="ej: 12.5"
                    {...register("weight")}
                  />
                  {errors.weight && (
                    <p className="text-sm text-destructive">
                      {errors.weight.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperatura (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="ej: 38.5"
                    {...register("temperature")}
                  />
                  {errors.temperature && (
                    <p className="text-sm text-destructive">
                      {errors.temperature.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heart_rate">Frec. cardiaca (bpm)</Label>
                  <Input
                    id="heart_rate"
                    type="number"
                    min="0"
                    placeholder="ej: 120"
                    {...register("heart_rate")}
                  />
                  {errors.heart_rate && (
                    <p className="text-sm text-destructive">
                      {errors.heart_rate.message}
                    </p>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            {/* Sección 3: Examen clínico - colapsada por default */}
            <CollapsibleSection
              title="Examen clínico"
              hasContent={hasExam}
              preview={
                anamnesis
                  ? anamnesis.slice(0, 60)
                  : symptoms
                    ? symptoms.slice(0, 60)
                    : ""
              }
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="anamnesis">Anamnesis</Label>
                  <AutoTextarea
                    id="anamnesis"
                    placeholder="Historia referida por el propietario..."
                    {...register("anamnesis")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="symptoms">Síntomas / Hallazgos</Label>
                  <AutoTextarea
                    id="symptoms"
                    placeholder="Hallazgos del examen físico..."
                    {...register("symptoms")}
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* Sección 4: Diagnóstico y tratamiento - expandida por default */}
            <CollapsibleSection
              title="Diagnóstico y tratamiento"
              defaultOpen
              hasContent={hasDiagTreatment}
              preview={
                diagnosis
                  ? diagnosis.slice(0, 60)
                  : treatment
                    ? treatment.slice(0, 60)
                    : ""
              }
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnóstico</Label>
                  <AutoTextarea
                    id="diagnosis"
                    placeholder="Diagnóstico presuntivo o definitivo..."
                    {...register("diagnosis")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="treatment">Tratamiento</Label>
                  <AutoTextarea
                    id="treatment"
                    placeholder="Medicamentos, procedimientos, indicaciones..."
                    {...register("treatment")}
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* Seccion 5: Observaciones - colapsada por default */}
            <CollapsibleSection
              title="Observaciones"
              hasContent={hasObservations}
              preview={observations ? observations.slice(0, 60) : ""}
            >
              <div className="space-y-2">
                <Label htmlFor="observations">Observaciones</Label>
                <AutoTextarea
                  id="observations"
                  placeholder="Notas adicionales, seguimiento recomendado..."
                  {...register("observations")}
                />
              </div>
            </CollapsibleSection>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading
                  ? isEditing
                    ? "Guardando..."
                    : "Creando..."
                  : isEditing
                    ? "Guardar cambios"
                    : "Crear registro"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                router.push(
                  `/${clinicSlug}/clients/${clientId}/pets/${petId}/records`
                )
              }
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Dialog de confirmación de plantilla */}
      <Dialog
        open={!!pendingTemplate}
        onOpenChange={(open) => {
          if (!open) setPendingTemplate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar plantilla</DialogTitle>
            <DialogDescription>
              Se aplicará la plantilla &quot;{pendingTemplate?.name}&quot;. Solo
              se rellenarán los campos que estén vacíos, no se sobreescribirá lo
              que ya hayas escrito.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline">
                  Cancelar
                </Button>
              }
            />
            <Button onClick={() => pendingTemplate && applyTemplate(pendingTemplate)}>
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
