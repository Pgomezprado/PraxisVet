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
import { PhysicalExamFields } from "./physical-exam-fields";
import type { PhysicalExam } from "@/types";
import { createVaccination } from "@/app/[clinic]/clients/[id]/pets/[petId]/vaccinations/actions";
import { createDeworming } from "@/app/[clinic]/clients/[id]/pets/[petId]/dewormings/actions";
import { DEWORMING_TYPES } from "@/lib/validations/dewormings";
import { createPrescription } from "@/app/[clinic]/clients/[id]/pets/[petId]/records/[recordId]/prescriptions/actions";
import {
  MEDICATION_SUGGESTIONS,
  FREQUENCY_OPTIONS,
  DURATION_OPTIONS,
} from "@/lib/validations/prescriptions";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Printer } from "lucide-react";

interface InlinePrescriptionRow {
  medication: string;
  dose: string;
  frequency: string;
  duration: string;
  notes: string;
  is_retained: boolean;
}

function emptyPrescriptionRow(): InlinePrescriptionRow {
  return {
    medication: "",
    dose: "",
    frequency: "",
    duration: "",
    notes: "",
    is_retained: false,
  };
}

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
  const [postSaveWarning, setPostSaveWarning] = useState<string | null>(null);

  const [vaccineName, setVaccineName] = useState("");
  const [vaccineLot, setVaccineLot] = useState("");
  const [vaccineNextDueDate, setVaccineNextDueDate] = useState("");

  const [dewormingType, setDewormingType] =
    useState<(typeof DEWORMING_TYPES)[number]>("interna");
  const [dewormingProduct, setDewormingProduct] = useState("");
  const [dewormingNextDueDate, setDewormingNextDueDate] = useState("");

  const [inlinePrescriptions, setInlinePrescriptions] = useState<
    InlinePrescriptionRow[]
  >([]);
  const [medAutocompleteOpenIdx, setMedAutocompleteOpenIdx] = useState<
    number | null
  >(null);

  function updatePrescriptionRow(
    index: number,
    patch: Partial<InlinePrescriptionRow>
  ) {
    setInlinePrescriptions((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }
  function addPrescriptionRow() {
    setInlinePrescriptions((prev) => [...prev, emptyPrescriptionRow()]);
  }
  function removePrescriptionRow(index: number) {
    setInlinePrescriptions((prev) => prev.filter((_, i) => i !== index));
    if (medAutocompleteOpenIdx === index) setMedAutocompleteOpenIdx(null);
  }

  const isEditing = !!record;
  const draftKey = `praxisvet:draft:record:v2:${organization.id}:${petId}`;
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

  async function onSubmit(data: ClinicalRecordInput) {
    setLoading(true);
    setError(null);
    setPostSaveWarning(null);

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

    // Detección por intención: si el vet llenó el campo clave, se registra.
    const wantsVaccine = !isEditing && vaccineName.trim().length > 0;
    const wantsDeworming = !isEditing && dewormingProduct.trim().length > 0;
    const pendingPrescriptions = isEditing
      ? []
      : inlinePrescriptions.filter((row) => row.medication.trim().length > 0);

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

    const recordId = result.data.id;
    const warnings: string[] = [];

    if (wantsVaccine) {
      const vaxResult = await createVaccination(organization.id, {
        pet_id: petId,
        clinical_record_id: recordId,
        vet_id: data.vet_id,
        vaccine_name: vaccineName.trim(),
        lot_number: vaccineLot.trim(),
        date_administered: data.date,
        next_due_date: vaccineNextDueDate,
        notes: "",
      });
      if (!vaxResult.success) {
        warnings.push(`Vacuna no registrada: ${vaxResult.error}`);
      }
    }

    if (wantsDeworming) {
      const dwResult = await createDeworming(organization.id, {
        pet_id: petId,
        clinical_record_id: recordId,
        vet_id: data.vet_id,
        type: dewormingType,
        date_administered: data.date,
        product: dewormingProduct.trim(),
        next_due_date: dewormingNextDueDate,
        pregnant_cohabitation: false,
        notes: "",
      });
      if (!dwResult.success) {
        warnings.push(`Desparasitación no registrada: ${dwResult.error}`);
      }
    }

    let createdPrescriptions = 0;
    for (const row of pendingPrescriptions) {
      const rxResult = await createPrescription(organization.id, clinicSlug, {
        clinical_record_id: recordId,
        medication: row.medication.trim(),
        dose: row.dose.trim(),
        frequency: row.frequency,
        duration: row.duration,
        notes: row.notes.trim(),
        is_retained: row.is_retained,
      });
      if (!rxResult.success) {
        warnings.push(
          `Receta "${row.medication}" no registrada: ${rxResult.error}`
        );
      } else {
        createdPrescriptions += 1;
      }
    }

    if (warnings.length > 0) {
      setPostSaveWarning(
        `${warnings.join(" ")} La ficha sí se guardó; registra estos datos manualmente.`
      );
      setLoading(false);
      return;
    }

    if (createdPrescriptions > 0 && typeof window !== "undefined") {
      window.open(
        `/api/${clinicSlug}/prescriptions/${recordId}/pdf`,
        "_blank",
        "noopener,noreferrer"
      );
    }

    router.push(`/${clinicSlug}/appointments`);
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

            {postSaveWarning && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                {postSaveWarning}
              </div>
            )}

            {/* Fecha y veterinario */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <DatePicker
                  id="date"
                  value={watch("date") ?? ""}
                  onChange={(v) =>
                    setValue("date", v, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  aria-invalid={!!errors.date}
                />
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

            {!isEditing && (
              <CollapsibleSection
                title="Vacuna aplicada (opcional)"
                hasContent={vaccineName.trim().length > 0}
                preview={vaccineName}
              >
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Si aplicas una vacuna en esta consulta, completa estos
                    datos. Se registrará automáticamente al guardar la ficha.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="inline_vaccine_name">
                        Nombre de la vacuna
                      </Label>
                      <Input
                        id="inline_vaccine_name"
                        placeholder="Ej: Sextuple canina"
                        value={vaccineName}
                        onChange={(e) => setVaccineName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="inline_vaccine_lot">
                        N° de lote (opcional)
                      </Label>
                      <Input
                        id="inline_vaccine_lot"
                        placeholder="Ej: LT-2026-A01"
                        value={vaccineLot}
                        onChange={(e) => setVaccineLot(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="inline_vaccine_next">
                      Próxima dosis (opcional)
                    </Label>
                    <DatePicker
                      id="inline_vaccine_next"
                      value={vaccineNextDueDate}
                      onChange={setVaccineNextDueDate}
                      placeholder="Fecha próxima dosis"
                    />
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {!isEditing && (
              <CollapsibleSection
                title="Desparasitación aplicada (opcional)"
                hasContent={dewormingProduct.trim().length > 0}
                preview={dewormingProduct}
              >
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Si desparasitas en esta consulta, completa estos datos.
                    Se registrará automáticamente al guardar la ficha.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="inline_deworming_type">Tipo</Label>
                      <Select
                        id="inline_deworming_type"
                        value={dewormingType}
                        onChange={(e) =>
                          setDewormingType(
                            e.target.value as (typeof DEWORMING_TYPES)[number]
                          )
                        }
                      >
                        <option value="interna">Interna</option>
                        <option value="externa">Externa</option>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="inline_deworming_product">
                        Producto
                      </Label>
                      <Input
                        id="inline_deworming_product"
                        placeholder="Ej: Drontal Plus"
                        value={dewormingProduct}
                        onChange={(e) => setDewormingProduct(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="inline_deworming_next">
                      Próxima dosis (opcional)
                    </Label>
                    <DatePicker
                      id="inline_deworming_next"
                      value={dewormingNextDueDate}
                      onChange={setDewormingNextDueDate}
                      placeholder="Fecha próxima desparasitación"
                    />
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {!isEditing && (
              <CollapsibleSection
                title="Receta (opcional)"
                hasContent={inlinePrescriptions.some(
                  (r) => r.medication.trim().length > 0
                )}
                preview={
                  inlinePrescriptions
                    .filter((r) => r.medication.trim().length > 0)
                    .map((r) => r.medication)
                    .join(", ") || ""
                }
              >
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Agrega los medicamentos que estás recetando. Usa el botón{" "}
                    <strong>Imprimir receta</strong> al final para guardar la
                    ficha y abrir el PDF listo para imprimir.
                  </p>

                  {inlinePrescriptions.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      Todavía no hay medicamentos en esta receta.
                    </p>
                  )}

                  {inlinePrescriptions.map((row, index) => {
                    const filteredMeds = row.medication
                      ? MEDICATION_SUGGESTIONS.filter((m) =>
                          m
                            .toLowerCase()
                            .includes(row.medication.toLowerCase())
                        )
                      : [...MEDICATION_SUGGESTIONS];
                    const isOpen = medAutocompleteOpenIdx === index;

                    return (
                      <div
                        key={index}
                        className="rounded-md border border-border/60 bg-background/50 p-3 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Medicamento #{index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePrescriptionRow(index)}
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            aria-label={`Eliminar medicamento ${index + 1}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor={`rx_med_${index}`}>
                            Medicamento
                          </Label>
                          <div className="relative">
                            <Input
                              id={`rx_med_${index}`}
                              placeholder="Ej: Amoxicilina"
                              autoComplete="off"
                              value={row.medication}
                              onFocus={() => setMedAutocompleteOpenIdx(index)}
                              onBlur={() =>
                                setTimeout(
                                  () => setMedAutocompleteOpenIdx(null),
                                  150
                                )
                              }
                              onChange={(e) =>
                                updatePrescriptionRow(index, {
                                  medication: e.target.value,
                                })
                              }
                            />
                            {isOpen && filteredMeds.length > 0 && (
                              <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-md max-h-40 overflow-y-auto">
                                {filteredMeds.map((med) => (
                                  <button
                                    key={med}
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      updatePrescriptionRow(index, {
                                        medication: med,
                                      });
                                      setMedAutocompleteOpenIdx(null);
                                    }}
                                  >
                                    {med}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-1">
                            <Label htmlFor={`rx_dose_${index}`}>Dosis</Label>
                            <Input
                              id={`rx_dose_${index}`}
                              placeholder="Ej: 10mg/kg"
                              value={row.dose}
                              onChange={(e) =>
                                updatePrescriptionRow(index, {
                                  dose: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`rx_freq_${index}`}>
                              Frecuencia
                            </Label>
                            <Select
                              id={`rx_freq_${index}`}
                              value={row.frequency}
                              onChange={(e) =>
                                updatePrescriptionRow(index, {
                                  frequency: e.target.value,
                                })
                              }
                            >
                              <option value="">Seleccionar...</option>
                              {FREQUENCY_OPTIONS.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`rx_dur_${index}`}>Duración</Label>
                            <Select
                              id={`rx_dur_${index}`}
                              value={row.duration}
                              onChange={(e) =>
                                updatePrescriptionRow(index, {
                                  duration: e.target.value,
                                })
                              }
                            >
                              <option value="">Seleccionar...</option>
                              {DURATION_OPTIONS.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor={`rx_notes_${index}`}>
                            Indicaciones (opcional)
                          </Label>
                          <Textarea
                            id={`rx_notes_${index}`}
                            rows={2}
                            placeholder="Ej: Administrar con alimento"
                            value={row.notes}
                            onChange={(e) =>
                              updatePrescriptionRow(index, {
                                notes: e.target.value,
                              })
                            }
                          />
                        </div>

                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-border"
                            checked={row.is_retained}
                            onChange={(e) =>
                              updatePrescriptionRow(index, {
                                is_retained: e.target.checked,
                              })
                            }
                          />
                          <span>Receta retenida (psicotrópico/regulado)</span>
                        </label>
                      </div>
                    );
                  })}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPrescriptionRow}
                    >
                      <Plus className="size-4" />
                      Agregar medicamento
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        loading ||
                        !inlinePrescriptions.some(
                          (r) => r.medication.trim().length > 0
                        )
                      }
                    >
                      <Printer className="size-4" />
                      {loading ? "Guardando..." : "Imprimir receta"}
                    </Button>
                  </div>
                </div>
              </CollapsibleSection>
            )}

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
                onClick={() => router.push(`/${clinicSlug}/appointments`)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
