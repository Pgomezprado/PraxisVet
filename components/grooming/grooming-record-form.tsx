"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  groomingRecordSchema,
  type GroomingRecordInput,
} from "@/lib/validations/grooming-records";
import { useClinic } from "@/lib/context/clinic-context";
import {
  createGroomingRecord,
  updateGroomingRecord,
} from "@/app/[clinic]/clients/[id]/pets/[petId]/grooming/actions";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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
import { Loader2, Scissors } from "lucide-react";
import { formatCLP } from "@/lib/utils/format";

interface Groomer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  specialty: string | null;
}

interface GroomingRecordFormProps {
  petId: string;
  petName: string;
  clientId: string;
  groomers: Groomer[];
  serviceOptions: string[];
  record?: {
    id: string;
    groomer_id: string | null;
    appointment_id: string | null;
    date: string;
    service_performed: string | null;
    observations: string | null;
    price: number | null;
  };
  defaultAppointmentId?: string;
  defaultGroomerId?: string;
  /** Si se especifica, el formulario redirige aquí tras crear (en vez de ir al detalle). */
  successRedirect?: string;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

export function GroomingRecordForm({
  petId,
  petName,
  clientId,
  groomers,
  serviceOptions,
  record,
  defaultAppointmentId,
  defaultGroomerId,
  successRedirect,
}: GroomingRecordFormProps) {
  const router = useRouter();
  const { organization, clinicSlug } = useClinic();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isEditing = !!record;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GroomingRecordInput>({
    resolver: zodResolver(groomingRecordSchema),
    defaultValues: {
      pet_id: petId,
      groomer_id: record?.groomer_id ?? defaultGroomerId ?? "",
      appointment_id: record?.appointment_id ?? defaultAppointmentId ?? "",
      date: record?.date ?? new Date().toISOString().split("T")[0],
      service_performed: record?.service_performed ?? "",
      observations: record?.observations ?? "",
      price: record?.price ?? null,
    },
  });

  const priceValue = watch("price");

  async function onSubmit(data: GroomingRecordInput) {
    setError(null);
    setLoading(true);

    const result = isEditing
      ? await updateGroomingRecord(record.id, clinicSlug, clientId, petId, data)
      : await createGroomingRecord(organization.id, clinicSlug, clientId, data);

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push(
      successRedirect ??
        `/${clinicSlug}/clients/${clientId}/pets/${petId}/grooming/${result.data.id}`
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Scissors className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              {isEditing ? "Editar servicio" : "Nuevo servicio de peluquería"}
            </CardTitle>
            <CardDescription>
              Registra lo que hiciste con {petName}. Las observaciones son opcionales.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="groomer_id">Peluquero *</Label>
              <Select
                id="groomer_id"
                {...register("groomer_id")}
                aria-invalid={!!errors.groomer_id}
              >
                <option value="">Seleccionar peluquero</option>
                {groomers.map((g) => (
                  <option key={g.id} value={g.id}>
                    {[g.first_name, g.last_name].filter(Boolean).join(" ")}
                    {g.specialty ? ` · ${g.specialty}` : ""}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.groomer_id?.message} />
            </div>

            <div>
              <Label htmlFor="date">Fecha *</Label>
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
              <FieldError message={errors.date?.message} />
            </div>
          </div>

          <div>
            <Label htmlFor="service_performed">Servicio realizado *</Label>
            <Combobox
              id="service_performed"
              value={watch("service_performed") ?? ""}
              onChange={(v) =>
                setValue("service_performed", v, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              options={serviceOptions}
              placeholder={
                serviceOptions.length > 0
                  ? "Busca o escribe el servicio"
                  : "Ej: Baño + corte"
              }
              aria-invalid={!!errors.service_performed}
            />
            {serviceOptions.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Tip: agrega los servicios de peluquería en Configuración → Servicios para que aparezcan acá al escribir.
              </p>
            ) : null}
            <FieldError message={errors.service_performed?.message} />
          </div>

          <div>
            <Label htmlFor="price">
              Valor del servicio{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (opcional)
              </span>
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="price"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                placeholder="25000"
                className="pl-7"
                {...register("price", {
                  setValueAs: (v) => {
                    if (v === "" || v === null || v === undefined) return null;
                    const n = Number(v);
                    return Number.isFinite(n) ? Math.round(n) : null;
                  },
                })}
                aria-invalid={!!errors.price}
              />
            </div>
            {typeof priceValue === "number" && priceValue > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Equivale a {formatCLP(priceValue)}.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Déjalo vacío si el servicio fue de cortesía.
              </p>
            )}
            <FieldError message={errors.price?.message} />
          </div>

          <div>
            <Label htmlFor="observations">
              Observaciones{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (opcional)
              </span>
            </Label>
            <Textarea
              id="observations"
              placeholder="Ej: muy nervioso, requiere bozal. Piel sensible, no tolera secador fuerte."
              rows={4}
              {...register("observations")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Estas notas las verás tú y otros peluqueros en futuras visitas — ayudan a que el animal tenga una mejor experiencia.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              {isEditing ? "Guardar cambios" : "Guardar servicio"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
