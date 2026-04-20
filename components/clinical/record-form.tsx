"use client";

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { CalendarPlus } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
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
import { PhysicalExamFields } from "./physical-exam-fields";
import type { PhysicalExam } from "@/types";

interface Vet {
  id: string;
  first_name: string | null;
  last_name: string | null;
  specialty: string | null;
}

const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000;
const DRAFT_DEBOUNCE_MS = 10_000;

interface DraftPayload {
  savedAt: number;
  data: Partial<ClinicalRecordInput>;
}

function formatDraftAge(savedAt: number): string {
  const diffMin = Math.floor((Date.now() - savedAt) / 60_000);
  if (diffMin < 1) return "hace menos de un minuto";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return diffH === 1 ? "hace 1 hora" : `hace ${diffH} horas`;
  return "hace más de un día";
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
    heart_rate_unmeasurable?: boolean | null;
    heart_auscultation_status?: "sin_hallazgos" | "con_hallazgos" | null;
    heart_auscultation_findings?: string | null;
    respiratory_rate: number | null;
    respiratory_auscultation_status?: "sin_hallazgos" | "con_hallazgos" | null;
    respiratory_auscultation_findings?: string | null;
    capillary_refill_seconds: number | null;
    skin_fold_seconds: number | null;
    physical_exam: PhysicalExam | null;
    next_consultation_date?: string | null;
    next_consultation_note?: string | null;
  };
  defaultAppointmentId?: string;
  defaultVetId?: string;
  defaultReason?: string;
  extraSections?: ReactNode;
}

export function RecordForm({
  petId,
  clientId,
  vets,
  record,
  defaultAppointmentId,
  defaultVetId,
  defaultReason,
  extraSections,
}: RecordFormProps) {
  const router = useRouter();
  const { organization, clinicSlug } = useClinic();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<RecordTemplate | null>(
    null
  );
  const [quickTemplateLoading, setQuickTemplateLoading] = useState<
    "Vacunacion" | "Desparasitacion" | null
  >(null);

  const isEditing = !!record;
  const draftKey = `praxisvet:draft:record:${organization.id}:${petId}`;
  const [recoverableDraft, setRecoverableDraft] = useState<DraftPayload | null>(
    null
  );
  const draftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    control,
    formState: { errors },
  } = useForm<ClinicalRecordInput>({
    resolver: zodResolver(clinicalRecordSchema),
    defaultValues: {
      pet_id: petId,
      vet_id: record?.vet_id ?? defaultVetId ?? "",
      appointment_id: record?.appointment_id ?? defaultAppointmentId ?? "",
      date: record?.date ?? new Date().toISOString().split("T")[0],
      reason: record?.reason ?? defaultReason ?? "",
      anamnesis: record?.anamnesis ?? "",
      symptoms: record?.symptoms ?? "",
      diagnosis: record?.diagnosis ?? "",
      treatment: record?.treatment ?? "",
      observations: record?.observations ?? "",
      weight: record?.weight ?? ("" as unknown as undefined),
      temperature: record?.temperature ?? ("" as unknown as undefined),
      heart_rate: record?.heart_rate ?? ("" as unknown as undefined),
      heart_rate_unmeasurable: record?.heart_rate_unmeasurable ?? false,
      heart_auscultation_status:
        record?.heart_auscultation_status ?? ("" as unknown as undefined),
      heart_auscultation_findings: record?.heart_auscultation_findings ?? "",
      respiratory_rate: record?.respiratory_rate ?? ("" as unknown as undefined),
      respiratory_auscultation_status:
        record?.respiratory_auscultation_status ?? ("" as unknown as undefined),
      respiratory_auscultation_findings:
        record?.respiratory_auscultation_findings ?? "",
      capillary_refill_seconds:
        record?.capillary_refill_seconds ?? ("" as unknown as undefined),
      skin_fold_seconds:
        record?.skin_fold_seconds ?? ("" as unknown as undefined),
      physical_exam: record?.physical_exam ?? {},
      next_consultation_date: record?.next_consultation_date ?? "",
      next_consultation_note: record?.next_consultation_note ?? "",
    },
  });

  useEffect(() => {
    if (isEditing || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DraftPayload;
      if (!parsed?.savedAt || Date.now() - parsed.savedAt > DRAFT_EXPIRY_MS) {
        window.localStorage.removeItem(draftKey);
        return;
      }
      setRecoverableDraft(parsed);
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [draftKey, isEditing]);

  useEffect(() => {
    if (isEditing || typeof window === "undefined") return;
    const subscription = watch((values) => {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
      draftTimeoutRef.current = setTimeout(() => {
        const hasContent =
          !!values.reason?.trim() ||
          !!values.anamnesis?.trim() ||
          !!values.symptoms?.trim() ||
          !!values.diagnosis?.trim() ||
          !!values.treatment?.trim() ||
          !!values.observations?.trim();
        if (!hasContent) return;
        try {
          const payload: DraftPayload = {
            savedAt: Date.now(),
            data: values as Partial<ClinicalRecordInput>,
          };
          window.localStorage.setItem(draftKey, JSON.stringify(payload));
        } catch {
          // localStorage lleno o deshabilitado: silencioso.
        }
      }, DRAFT_DEBOUNCE_MS);
    });
    return () => {
      subscription.unsubscribe();
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    };
  }, [watch, draftKey, isEditing]);

  const recoverDraft = useCallback(() => {
    if (!recoverableDraft) return;
    reset({
      ...getValues(),
      ...recoverableDraft.data,
      pet_id: petId,
    } as ClinicalRecordInput);
    setRecoverableDraft(null);
  }, [recoverableDraft, reset, getValues, petId]);

  const discardDraft = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(draftKey);
    }
    setRecoverableDraft(null);
  }, [draftKey]);

  const heartAuscultationFindings = watch("heart_auscultation_findings");
  const respiratoryAuscultationFindings = watch(
    "respiratory_auscultation_findings"
  );
  const physicalExam = watch("physical_exam");
  const hasPhysicalExam =
    !!physicalExam &&
    Object.values(physicalExam).some((v) => v != null && v !== "");
  const respiratoryRate = watch("respiratory_rate");
  const capillaryRefill = watch("capillary_refill_seconds");
  const skinFold = watch("skin_fold_seconds");
  const weight = watch("weight");
  const temperature = watch("temperature");
  const heartRate = watch("heart_rate");
  const heartRateUnmeasurable = watch("heart_rate_unmeasurable");
  const heartAuscultationStatus = watch("heart_auscultation_status");
  const respiratoryAuscultationStatus = watch("respiratory_auscultation_status");
  const symptomsValue = watch("symptoms");
  const hasPhysicalContent =
    hasPhysicalExam ||
    !!symptomsValue?.trim() ||
    (respiratoryRate != null && respiratoryRate !== "") ||
    (capillaryRefill != null && capillaryRefill !== "") ||
    (skinFold != null && skinFold !== "") ||
    (weight != null && (weight as unknown as string) !== "") ||
    (temperature != null && (temperature as unknown as string) !== "") ||
    (heartRate != null && (heartRate as unknown as string) !== "") ||
    !!heartRateUnmeasurable;

  const watchedValues = watch([
    "reason",
    "anamnesis",
    "diagnosis",
    "treatment",
    "observations",
  ]);

  const [reason, anamnesis, diagnosis, treatment, observations] = watchedValues;

  const hasDiagTreatment = !!(diagnosis || treatment);
  const hasObservations = !!observations;

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

  async function createRecordFromQuickTemplate(
    template: RecordTemplate,
    openKind: "vaccine" | "deworming"
  ) {
    if (isEditing) return;
    setError(null);

    const current = getValues();
    const vetId = current.vet_id;
    if (!vetId) {
      setError(
        "Selecciona un veterinario antes de aplicar esta plantilla rápida."
      );
      return;
    }

    setQuickTemplateLoading(
      template.name as "Vacunacion" | "Desparasitacion"
    );

    const payload: ClinicalRecordInput = {
      pet_id: petId,
      vet_id: vetId,
      appointment_id: current.appointment_id || "",
      date: current.date || new Date().toISOString().split("T")[0],
      reason: template.reason,
      anamnesis: "",
      symptoms: template.symptoms,
      diagnosis: template.diagnosis,
      treatment: template.treatment,
      observations: template.observations ?? "",
    };

    const result = await createRecord(
      organization.id,
      clinicSlug,
      clientId,
      payload
    );

    if (!result.success) {
      setError(result.error);
      setQuickTemplateLoading(null);
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(draftKey);
    }

    router.push(
      `/${clinicSlug}/clients/${clientId}/pets/${petId}/records/${result.data.id}?open=${openKind}&created=1`
    );
  }

  async function onSubmit(data: ClinicalRecordInput) {
    setLoading(true);
    setError(null);

    // Sanea strings vacíos de physical_exam que Zod enum rechaza.
    if (data.physical_exam) {
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.physical_exam)) {
        if (typeof v === "string" && v.trim() !== "") cleaned[k] = v;
      }
      data = {
        ...data,
        physical_exam: Object.keys(cleaned).length
          ? (cleaned as ClinicalRecordInput["physical_exam"])
          : undefined,
      };
    }

    const result = isEditing
      ? await updateRecord(record!.id, clinicSlug, clientId, petId, data)
      : await createRecord(organization.id, clinicSlug, clientId, data);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (!isEditing && typeof window !== "undefined") {
      window.localStorage.removeItem(draftKey);
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
            {isEditing ? "Editar ficha clínica" : "Nueva ficha clínica"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "Modifica la información de la ficha clínica."
              : "Registra una nueva consulta clínica para esta mascota."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {recoverableDraft && (
              <div className="flex flex-col gap-3 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Tienes un borrador sin guardar</p>
                  <p className="text-xs text-muted-foreground">
                    Autoguardado {formatDraftAge(recoverableDraft.savedAt)}.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={discardDraft}
                  >
                    Descartar
                  </Button>
                  <Button type="button" size="sm" onClick={recoverDraft}>
                    Recuperar
                  </Button>
                </div>
              </div>
            )}
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
                {RECORD_TEMPLATES.map((template) => {
                  const isQuickVaccine =
                    !isEditing && template.name === "Vacunacion";
                  const isQuickDeworming =
                    !isEditing && template.name === "Desparasitacion";
                  const isQuick = isQuickVaccine || isQuickDeworming;
                  const isLoading = quickTemplateLoading === template.name;

                  return (
                    <button
                      key={template.name}
                      type="button"
                      disabled={!!quickTemplateLoading}
                      onClick={() => {
                        if (isQuickVaccine) {
                          createRecordFromQuickTemplate(template, "vaccine");
                        } else if (isQuickDeworming) {
                          createRecordFromQuickTemplate(template, "deworming");
                        } else {
                          setPendingTemplate(template);
                        }
                      }}
                      className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading
                        ? `${template.name}...`
                        : isQuickVaccine
                          ? "Crear ficha + Vacuna"
                          : isQuickDeworming
                            ? "Crear ficha + Desparasitación"
                            : template.name}
                    </button>
                  );
                })}
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

            {/* Motivo de consulta - siempre abierta, opcional pero recomendado */}
            <CollapsibleSection title="Motivo de consulta" alwaysOpen hasContent={!!reason} preview={reason || ""}>
              <div className="space-y-2">
                <Label htmlFor="reason">
                  Motivo{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (recomendado)
                  </span>
                </Label>
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

            {/* Anamnesis: relato del propietario */}
            <CollapsibleSection
              title="Anamnesis"
              defaultOpen
              hasContent={!!anamnesis}
              preview={anamnesis ? anamnesis.slice(0, 60) : ""}
            >
              <div className="space-y-2">
                <Label htmlFor="anamnesis">
                  Relato del propietario
                </Label>
                <AutoTextarea
                  id="anamnesis"
                  placeholder="Historia referida por el propietario..."
                  {...register("anamnesis")}
                />
              </div>
            </CollapsibleSection>

            {/* Examen físico: vitales + constantes fisiológicas + observacionales */}
            <CollapsibleSection
              title="Examen físico"
              defaultOpen
              hasContent={hasPhysicalContent}
              preview={
                hasPhysicalContent
                  ? "Peso, temperatura, FR, TLLC, mucosas..."
                  : ""
              }
            >
              <div className="space-y-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Vitales
                </p>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
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
                    <Label htmlFor="heart_rate">FC (bpm)</Label>
                    <Input
                      id="heart_rate"
                      type="number"
                      min="0"
                      placeholder="ej: 120"
                      disabled={!!heartRateUnmeasurable}
                      {...register("heart_rate")}
                    />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="size-3.5 accent-primary"
                        {...register("heart_rate_unmeasurable", {
                          onChange: (e) => {
                            if (e.target.checked) {
                              setValue(
                                "heart_rate",
                                "" as unknown as undefined
                              );
                            }
                          },
                        })}
                      />
                      No se escucha
                    </label>
                    {errors.heart_rate && (
                      <p className="text-sm text-destructive">
                        {errors.heart_rate.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="respiratory_rate">FR (resp/min)</Label>
                    <Input
                      id="respiratory_rate"
                      type="number"
                      min="0"
                      placeholder="ej: 24"
                      {...register("respiratory_rate")}
                    />
                    {errors.respiratory_rate && (
                      <p className="text-sm text-destructive">
                        {errors.respiratory_rate.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Auscultación cardiaca: sin / con hallazgos */}
                <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Auscultación cardiaca
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        value="sin_hallazgos"
                        {...register("heart_auscultation_status", {
                          onChange: () =>
                            setValue("heart_auscultation_findings", ""),
                        })}
                      />
                      Sin hallazgos patológicos a la auscultación
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        value="con_hallazgos"
                        {...register("heart_auscultation_status")}
                      />
                      Hallazgos patológicos a la auscultación
                    </label>
                  </div>
                  {heartAuscultationStatus === "con_hallazgos" && (
                    <div className="space-y-1 pt-1">
                      <Label
                        htmlFor="heart_auscultation_findings"
                        className="text-xs"
                      >
                        Describe el hallazgo{" "}
                        <span className="font-normal text-muted-foreground">
                          (recomendado)
                        </span>
                      </Label>
                      <textarea
                        id="heart_auscultation_findings"
                        className="flex min-h-15 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="ej: soplo sistólico grado II/VI en foco mitral..."
                        {...register("heart_auscultation_findings")}
                      />
                      {!heartAuscultationFindings?.trim() && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Puedes guardar la ficha y describir el hallazgo más
                          tarde.
                        </p>
                      )}
                      {errors.heart_auscultation_findings && (
                        <p className="text-sm text-destructive">
                          {errors.heart_auscultation_findings.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <PhysicalExamFields
                  register={register}
                  errors={errors}
                  setValue={setValue}
                  earInspection={physicalExam?.ear_inspection}
                  respiratoryAuscultationStatus={respiratoryAuscultationStatus}
                  respiratoryAuscultationFindings={
                    respiratoryAuscultationFindings
                  }
                />

                <div className="space-y-2">
                  <Label htmlFor="symptoms">Signos observados</Label>
                  <AutoTextarea
                    id="symptoms"
                    placeholder="Hallazgos relevantes al examen clínico..."
                    {...register("symptoms")}
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* Diagnóstico y tratamiento - expandida por default */}
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

            {extraSections}

            {/* Próxima consulta sugerida (no agenda cita aún, solo deja la fecha registrada) */}
            <div className="rounded-md border border-border/60 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CalendarPlus className="size-4 text-primary" />
                <Label className="text-sm font-medium">
                  Próxima consulta (opcional)
                </Label>
              </div>
              <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                <div className="space-y-1">
                  <Controller
                    control={control}
                    name="next_consultation_date"
                    render={({ field }) => (
                      <DatePicker
                        id="next_consultation_date"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Fecha sugerida"
                      />
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    id="next_consultation_note"
                    placeholder="Motivo (ej: control vacuna sextuple)"
                    {...register("next_consultation_note")}
                  />
                  {errors.next_consultation_note && (
                    <p className="text-sm text-destructive">
                      {errors.next_consultation_note.message}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Queda guardada en la ficha. La recepcionista podrá agendarla
                cuando confirmes con el tutor.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading
                  ? isEditing
                    ? "Guardando..."
                    : "Creando..."
                  : isEditing
                    ? "Guardar cambios"
                    : "Crear ficha"}
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
