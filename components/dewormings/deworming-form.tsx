"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import {
  dewormingSchema,
  type DewormingInput,
  DEWORMING_TYPES,
} from "@/lib/validations/dewormings";
import { useClinic } from "@/lib/context/clinic-context";
import {
  createDeworming,
  updateDeworming,
} from "@/app/[clinic]/clients/[id]/pets/[petId]/dewormings/actions";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Deworming, OrganizationMember } from "@/types";

interface DewormingFormProps {
  petId: string;
  clientId: string;
  deworming?: Deworming;
  vets: Pick<OrganizationMember, "id" | "first_name" | "last_name">[];
  returnPath: string;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDateUi(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DewormingForm({
  petId,
  clientId: _clientId,
  deworming,
  vets,
  returnPath,
}: DewormingFormProps) {
  const router = useRouter();
  const { organization } = useClinic();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const isEditing = !!deworming;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DewormingInput>({
    resolver: zodResolver(dewormingSchema),
    defaultValues: {
      pet_id: petId,
      clinical_record_id: deworming?.clinical_record_id ?? "",
      vet_id: deworming?.vet_id ?? "",
      type: deworming?.type ?? "interna",
      date_administered:
        deworming?.date_administered ??
        new Date().toISOString().split("T")[0],
      product: deworming?.product ?? "",
      next_due_date: deworming?.next_due_date ?? "",
      pregnant_cohabitation: deworming?.pregnant_cohabitation ?? false,
      notes: deworming?.notes ?? "",
    },
  });

  const type = watch("type");
  const pregnant = watch("pregnant_cohabitation");
  const date = watch("date_administered");

  // Preview de cálculo (el trigger SQL es la fuente de verdad al persistir).
  const previewDue = useMemo(() => {
    if (!date) return null;
    if (type === "externa") return addDays(date, 30);
    if (type === "interna") return addDays(date, pregnant ? 30 : 90);
    return null;
  }, [date, type, pregnant]);

  async function onSubmit(data: DewormingInput) {
    if (isPending) return;
    setError(null);
    setIsPending(true);
    const payload: DewormingInput = {
      ...data,
      pregnant_cohabitation:
        data.type === "interna" ? !!data.pregnant_cohabitation : false,
    };
    const result = isEditing
      ? await updateDeworming(deworming!.id, payload, returnPath)
      : await createDeworming(organization.id, payload, returnPath);

    if (!result.success) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    router.replace(returnPath);
    router.refresh();
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing
              ? "Editar desparasitación"
              : "Registrar desparasitación"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "Modifica los datos del registro de desparasitación."
              : "Registra una nueva aplicación interna o externa."}
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
              <Label>Tipo</Label>
              <div className="flex gap-4">
                {DEWORMING_TYPES.map((t) => (
                  <label
                    key={t}
                    className="flex items-center gap-2 text-sm capitalize"
                  >
                    <input type="radio" value={t} {...register("type")} />
                    {t}
                  </label>
                ))}
              </div>
              {errors.type && (
                <p className="text-sm text-destructive">
                  {errors.type.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date_administered">Fecha de aplicación</Label>
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
                <Label htmlFor="product">Producto</Label>
                <Input
                  id="product"
                  placeholder="ej: Drontal Plus, Bravecto..."
                  {...register("product")}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <label
                className={`flex items-start gap-2 text-sm ${
                  type === "externa"
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  disabled={type === "externa"}
                  checked={!!pregnant}
                  onChange={(e) =>
                    setValue("pregnant_cohabitation", e.target.checked)
                  }
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    Convive con mujer embarazada
                    <Tooltip>
                      <TooltipTrigger type="button">
                        <Info className="size-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Si la mascota convive con una mujer embarazada, la
                        desparasitación interna se repite cada 1 mes (en vez de
                        cada 3 meses) para reducir riesgo zoonótico.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Solo aplica a desparasitación interna.
                  </p>
                </div>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="next_due_date">
                  Próxima fecha (opcional)
                </Label>
                <Input
                  id="next_due_date"
                  type="date"
                  {...register("next_due_date")}
                />
                {previewDue && (
                  <p className="text-xs text-muted-foreground">
                    Aprox. sugerida: {formatDateUi(previewDue)} (
                    {type === "externa"
                      ? "30 días"
                      : pregnant
                        ? "30 días, embarazada"
                        : "90 días"}
                    ). Se recalcula automáticamente al guardar si la dejas en
                    blanco.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="vet_id">Veterinario (opcional)</Label>
                <Select id="vet_id" {...register("vet_id")}>
                  <option value="">Seleccionar veterinario</option>
                  {vets.map((v) => (
                    <option key={v.id} value={v.id}>
                      {[v.first_name, v.last_name].filter(Boolean).join(" ")}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Observaciones, reacciones..."
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
                    : "Registrar desparasitación"}
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
    </TooltipProvider>
  );
}
