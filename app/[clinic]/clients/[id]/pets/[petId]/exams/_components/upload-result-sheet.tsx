"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ExamFileUpload,
  type UploadedExamFile,
} from "@/components/exams/exam-file-upload";
import {
  uploadExamResultSchema,
  type UploadExamResultInput,
} from "@/lib/validations/exams";
import { uploadExamResult } from "../actions";

interface UploadResultSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  petId: string;
  clientId: string;
  clinicSlug: string;
  examId: string;
  /** Solo veterinarios y admin pueden registrar la interpretación. */
  canInterpret: boolean;
  onUploaded?: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function UploadResultSheet({
  open,
  onOpenChange,
  orgId,
  petId,
  clientId,
  clinicSlug,
  examId,
  canInterpret,
  onUploaded,
}: UploadResultSheetProps) {
  const router = useRouter();
  const [uploaded, setUploaded] = useState<UploadedExamFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<UploadExamResultInput>({
    resolver: zodResolver(uploadExamResultSchema),
    defaultValues: {
      file_url: "",
      file_name: "",
      file_type: "",
      result_date: todayIso(),
      vet_interpretation: "",
    },
  });

  function handleFileChange(file: UploadedExamFile | null) {
    setUploaded(file);
  }

  function handleClose(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setUploaded(null);
      setServerError(null);
      reset({
        file_url: "",
        file_name: "",
        file_type: "",
        result_date: todayIso(),
        vet_interpretation: "",
      });
    }
  }

  async function onSubmit(values: UploadExamResultInput) {
    setServerError(null);

    if (!uploaded) {
      setServerError("Falta el archivo del resultado");
      return;
    }

    setSubmitting(true);
    const result = await uploadExamResult(
      orgId,
      clinicSlug,
      clientId,
      petId,
      examId,
      {
        ...values,
        file_url: uploaded.path,
        file_name: uploaded.name,
        file_type: uploaded.type,
      }
    );
    setSubmitting(false);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    handleClose(false);
    router.refresh();
    onUploaded?.();
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Cargar resultado del examen</SheetTitle>
          <SheetDescription>
            Sube el PDF o imagen del laboratorio. Si registras la interpretación
            clínica, podrás compartir el examen con el tutor.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 px-4 pb-4"
        >
          <div className="space-y-1.5">
            <Label>Archivo del resultado</Label>
            <ExamFileUpload
              orgId={orgId}
              petId={petId}
              examId={examId}
              value={uploaded}
              onChange={handleFileChange}
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="result_date">Fecha del resultado</Label>
            <Controller
              control={control}
              name="result_date"
              render={({ field }) => (
                <DatePicker
                  id="result_date"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Fecha del resultado"
                />
              )}
            />
            {errors.result_date && (
              <p className="text-xs text-destructive">
                {errors.result_date.message}
              </p>
            )}
          </div>

          {canInterpret && (
            <div className="space-y-1.5">
              <Label htmlFor="vet_interpretation">
                Interpretación del veterinario{" "}
                <span className="text-xs text-muted-foreground">
                  (requerida para compartir con el tutor)
                </span>
              </Label>
              <Textarea
                id="vet_interpretation"
                rows={5}
                placeholder="Resumen clínico, hallazgos relevantes, conducta sugerida..."
                {...register("vet_interpretation")}
              />
              {errors.vet_interpretation && (
                <p className="text-xs text-destructive">
                  {errors.vet_interpretation.message}
                </p>
              )}
            </div>
          )}

          {!canInterpret && (
            <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
              Tu rol puede subir el archivo, pero la interpretación clínica
              debe registrarla un veterinario o administrador.
            </div>
          )}

          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !uploaded}>
              {submitting ? "Guardando..." : "Guardar resultado"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
