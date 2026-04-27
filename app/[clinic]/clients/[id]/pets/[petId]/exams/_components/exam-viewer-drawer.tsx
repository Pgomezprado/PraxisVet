"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Loader2,
  Send,
  Trash2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ExamStatusBadge } from "@/components/exams/exam-status-badge";
import { getExamTypeLabel } from "@/components/exams/exam-type-labels";
import {
  deleteExam,
  getSignedExamUrl,
  shareExamWithTutor,
  updateInterpretation,
} from "../actions";
import type { ExamWithPeople } from "@/components/exams/types";

interface ExamViewerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: ExamWithPeople | null;
  orgId: string;
  petId: string;
  clientId: string;
  clinicSlug: string;
  canInterpret: boolean;
  canDelete: boolean;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const iso = dateStr.length === 10 ? dateStr + "T12:00:00" : dateStr;
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function personName(
  first: string | null | undefined,
  last: string | null | undefined
): string {
  const parts = [first, last].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Sin asignar";
}

export function ExamViewerDrawer({
  open,
  onOpenChange,
  exam,
  ...rest
}: ExamViewerDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-hidden p-0 sm:max-w-2xl"
      >
        {exam ? (
          // key fuerza remount cuando cambia el examen abierto, así el estado
          // interno (interpretación editada, errores, signed URL) se resetea
          // sin necesidad de useEffect que llame setState (que viola
          // react-hooks/set-state-in-effect).
          <ExamViewerBody
            key={exam.id}
            exam={exam}
            onClose={() => onOpenChange(false)}
            {...rest}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

interface ExamViewerBodyProps {
  exam: ExamWithPeople;
  orgId: string;
  petId: string;
  clientId: string;
  clinicSlug: string;
  canInterpret: boolean;
  canDelete: boolean;
  onClose: () => void;
}

function ExamViewerBody({
  exam,
  orgId,
  petId,
  clientId,
  clinicSlug,
  canInterpret,
  canDelete,
  onClose,
}: ExamViewerBodyProps) {
  const router = useRouter();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(
    exam.status === "resultado_cargado"
  );
  const [urlError, setUrlError] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState(
    exam.vet_interpretation ?? ""
  );
  const [savingInterpretation, setSavingInterpretation] = useState(false);
  const [interpretationStatus, setInterpretationStatus] = useState<
    string | null
  >(null);
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Sincronización con Supabase Storage: pedimos la signed URL al montar.
  // Este efecto SÍ debe correr porque sincroniza con un sistema externo.
  useEffect(() => {
    if (exam.status !== "resultado_cargado") return;

    let cancelled = false;
    getSignedExamUrl(orgId, exam.id).then((res) => {
      if (cancelled) return;
      if (!res.success) {
        setUrlError(res.error);
        setLoadingUrl(false);
        return;
      }
      setSignedUrl(res.data.url);
      setLoadingUrl(false);
    });

    return () => {
      cancelled = true;
    };
  }, [orgId, exam.id, exam.status]);

  const typeLabel = getExamTypeLabel(exam.type, exam.custom_type_label);
  const isImage = exam.result_file_type?.startsWith("image/");
  const isPdf = exam.result_file_type === "application/pdf";
  const requesterName = personName(
    exam.requested_by_member?.first_name,
    exam.requested_by_member?.last_name
  );
  const sharedAtLabel = exam.shared_with_tutor_at
    ? new Date(exam.shared_with_tutor_at).toLocaleString("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  async function handleSaveInterpretation() {
    setActionError(null);
    setInterpretationStatus(null);
    setSavingInterpretation(true);
    const result = await updateInterpretation(
      orgId,
      clinicSlug,
      clientId,
      petId,
      exam.id,
      { vet_interpretation: interpretation }
    );
    setSavingInterpretation(false);
    if (!result.success) {
      setActionError(result.error);
      return;
    }
    setInterpretationStatus("Interpretación guardada");
    router.refresh();
  }

  async function handleShare() {
    setActionError(null);
    setSharing(true);
    const result = await shareExamWithTutor(
      orgId,
      clinicSlug,
      clientId,
      petId,
      exam.id
    );
    setSharing(false);
    if (!result.success) {
      setActionError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (
      !confirm(
        "¿Seguro que quieres eliminar este examen? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }
    setActionError(null);
    setDeleting(true);
    const result = await deleteExam(
      orgId,
      clinicSlug,
      clientId,
      petId,
      exam.id
    );
    setDeleting(false);
    if (!result.success) {
      setActionError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  function handleDownload() {
    if (!signedUrl) return;
    const a = document.createElement("a");
    a.href = signedUrl;
    a.download = exam.result_file_name ?? "examen";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const canShare =
    exam.status === "resultado_cargado" &&
    !!exam.vet_interpretation &&
    exam.vet_interpretation.trim().length > 0;

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b">
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle>{typeLabel}</SheetTitle>
          <ExamStatusBadge status={exam.status} />
        </div>
        <SheetDescription>
          Solicitado por {requesterName} · {formatDate(exam.requested_at)}
          {exam.result_date && (
            <> · Resultado: {formatDate(exam.result_date)}</>
          )}
        </SheetDescription>
        {sharedAtLabel && (
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Enviado al tutor: {sharedAtLabel}
          </p>
        )}
      </SheetHeader>

      <div className="flex-1 overflow-y-auto">
        {exam.indications && (
          <div className="border-b bg-muted/30 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">
              Indicación / sospecha clínica
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">
              {exam.indications}
            </p>
          </div>
        )}

        {exam.status === "solicitado" ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 px-4 text-center">
            <FileText className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aún no hay resultado cargado para este examen.
            </p>
          </div>
        ) : (
          <div className="bg-black/40 px-4 py-3">
            {loadingUrl ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : urlError ? (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {urlError}
              </div>
            ) : signedUrl ? (
              isImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={signedUrl}
                  alt={exam.result_file_name ?? "Resultado"}
                  className="mx-auto max-h-[60vh] w-auto object-contain"
                />
              ) : isPdf ? (
                <iframe
                  src={signedUrl}
                  title={exam.result_file_name ?? "Resultado"}
                  className="h-[60vh] w-full rounded-md bg-white"
                />
              ) : (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  Formato no previsualizable. Usa Descargar para abrirlo.
                </div>
              )
            ) : null}
          </div>
        )}

        {exam.status === "resultado_cargado" && (
          <div className="space-y-3 border-t px-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="vet_interpretation_inline">
                Interpretación del veterinario
              </Label>
              {canInterpret ? (
                <Textarea
                  id="vet_interpretation_inline"
                  rows={5}
                  value={interpretation}
                  onChange={(e) => setInterpretation(e.target.value)}
                  placeholder="Resumen clínico, hallazgos relevantes, conducta sugerida..."
                  disabled={savingInterpretation}
                />
              ) : (
                <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                  {exam.vet_interpretation?.trim()
                    ? exam.vet_interpretation
                    : "Sin interpretación registrada."}
                </p>
              )}
              {interpretationStatus && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  {interpretationStatus}
                </p>
              )}
            </div>

            {canInterpret && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSaveInterpretation}
                disabled={
                  savingInterpretation ||
                  interpretation.trim() ===
                    (exam.vet_interpretation ?? "").trim()
                }
              >
                {savingInterpretation
                  ? "Guardando..."
                  : "Guardar interpretación"}
              </Button>
            )}
          </div>
        )}

        {actionError && (
          <div className="mx-4 mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {actionError}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-card px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" data-icon="inline-start" />
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {exam.status === "resultado_cargado" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!signedUrl}
              >
                <Download className="size-3.5" data-icon="inline-start" />
                Descargar
              </Button>
              {canInterpret && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleShare}
                  disabled={!canShare || sharing}
                  title={
                    !canShare
                      ? "Registra la interpretación antes de compartir"
                      : undefined
                  }
                >
                  <Send className="size-3.5" data-icon="inline-start" />
                  {sharing
                    ? "Enviando..."
                    : exam.shared_with_tutor_at
                      ? "Reenviar al tutor"
                      : "Compartir con tutor"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
