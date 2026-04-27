"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FlaskConical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EXAM_TYPE_OPTIONS } from "@/components/exams/exam-type-labels";
import {
  requestExamSchema,
  type RequestExamInput,
} from "@/lib/validations/exams";
import { requestExam } from "../actions";

interface RequestExamSheetProps {
  orgId: string;
  petId: string;
  clientId: string;
  clinicSlug: string;
  /** Si viene, la solicitud queda vinculada a esta ficha clínica. */
  clinicalRecordId?: string;
  /** Texto del trigger. Por defecto "Solicitar examen". */
  triggerLabel?: string;
  /** Variante visual del trigger. */
  triggerVariant?: "default" | "outline" | "secondary";
  /** Tamaño del trigger. */
  triggerSize?: "sm" | "default";
  /** Renderiza el trigger como icon-only. */
  iconOnly?: boolean;
  /** Callback al guardar exitosamente. */
  onSuccess?: (examId: string) => void;
}

export function RequestExamSheet({
  orgId,
  petId,
  clientId,
  clinicSlug,
  clinicalRecordId,
  triggerLabel = "Solicitar examen",
  triggerVariant = "default",
  triggerSize = "sm",
  iconOnly = false,
  onSuccess,
}: RequestExamSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<RequestExamInput>({
    resolver: zodResolver(requestExamSchema),
    defaultValues: {
      type: "hemograma",
      custom_type_label: "",
      indications: "",
      clinical_record_id: clinicalRecordId ?? "",
    },
  });

  const selectedType = watch("type");

  async function onSubmit(values: RequestExamInput) {
    setServerError(null);
    setSubmitting(true);
    const result = await requestExam(orgId, clinicSlug, clientId, petId, {
      ...values,
      clinical_record_id: clinicalRecordId ?? values.clinical_record_id,
    });
    setSubmitting(false);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    reset();
    setOpen(false);
    router.refresh();
    onSuccess?.(result.data.id);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setServerError(null);
      reset();
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button size={triggerSize} variant={triggerVariant}>
            {iconOnly ? (
              <Plus className="size-4" />
            ) : (
              <>
                <FlaskConical className="size-4" data-icon="inline-start" />
                {triggerLabel}
              </>
            )}
          </Button>
        }
      />
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Solicitar examen</SheetTitle>
          <SheetDescription>
            Queda registrado como pendiente. Cuando llegue el resultado, podrás
            cargar el archivo y la interpretación clínica.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 px-4 pb-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="exam_type">Tipo de examen</Label>
            <Select id="exam_type" {...register("type")}>
              {EXAM_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type.message}</p>
            )}
          </div>

          {selectedType === "otro" && (
            <div className="space-y-1.5">
              <Label htmlFor="custom_type_label">Detalle del examen</Label>
              <Input
                id="custom_type_label"
                placeholder="Ej: Test de Leishmania"
                {...register("custom_type_label")}
                aria-invalid={!!errors.custom_type_label}
              />
              {errors.custom_type_label && (
                <p className="text-xs text-destructive">
                  {errors.custom_type_label.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="indications">
              Indicaciones / sospecha clínica{" "}
              <span className="text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="indications"
              rows={4}
              placeholder="Ej: descartar anemia regenerativa post tratamiento..."
              {...register("indications")}
            />
            {errors.indications && (
              <p className="text-xs text-destructive">
                {errors.indications.message}
              </p>
            )}
          </div>

          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Solicitar examen"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
