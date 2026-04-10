"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

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

  const isEditing = !!record;

  const {
    register,
    handleSubmit,
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
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? "Editar registro clinico" : "Nuevo registro clinico"}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? "Modifica la informacion del registro clinico."
            : "Registra una nueva consulta clinica para esta mascota."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <input type="hidden" {...register("pet_id")} />
          <input type="hidden" {...register("appointment_id")} />

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
                    {[vet.first_name, vet.last_name].filter(Boolean).join(" ")}
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

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Motivo de consulta</h3>
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo</Label>
              <Input
                id="reason"
                placeholder="ej: Control general, vacunacion, malestar digestivo..."
                {...register("reason")}
              />
              {errors.reason && (
                <p className="text-sm text-destructive">
                  {errors.reason.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="anamnesis">Anamnesis (opcional)</Label>
              <Textarea
                id="anamnesis"
                placeholder="Historia referida por el propietario..."
                rows={3}
                {...register("anamnesis")}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Examen clinico</h3>
            <div className="space-y-2">
              <Label htmlFor="symptoms">Sintomas (opcional)</Label>
              <Textarea
                id="symptoms"
                placeholder="Hallazgos del examen fisico..."
                rows={3}
                {...register("symptoms")}
              />
            </div>
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
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Diagnostico y tratamiento</h3>
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnostico (opcional)</Label>
              <Textarea
                id="diagnosis"
                placeholder="Diagnostico presuntivo o definitivo..."
                rows={3}
                {...register("diagnosis")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="treatment">Tratamiento (opcional)</Label>
              <Textarea
                id="treatment"
                placeholder="Medicamentos, procedimientos, indicaciones..."
                rows={3}
                {...register("treatment")}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="observations">Observaciones (opcional)</Label>
            <Textarea
              id="observations"
              placeholder="Notas adicionales, seguimiento recomendado..."
              rows={3}
              {...register("observations")}
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
                  : "Crear registro"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
