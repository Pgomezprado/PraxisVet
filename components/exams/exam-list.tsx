"use client";

import { Eye, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExamStatusBadge } from "./exam-status-badge";
import { getExamTypeLabel } from "./exam-type-labels";
import type { ExamWithPeople } from "./types";

interface ExamListProps {
  exams: ExamWithPeople[];
  /** Path base para acciones (no se usa hoy para enlaces, pero queda disponible). */
  basePath?: string;
  /** Versión compacta: oculta separadores grandes y reduce padding. */
  compact?: boolean;
  /** El usuario actual puede interpretar (vet o admin). */
  canInterpret?: boolean;
  /** El usuario actual puede eliminar (admin only). */
  canDelete?: boolean;
  /** Callback al hacer click en una fila o en "Ver". */
  onRowClick?: (exam: ExamWithPeople) => void;
  /** Callback para "Cargar resultado" (cuando el examen está solicitado). */
  onUploadClick?: (exam: ExamWithPeople) => void;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  // Acepta "yyyy-MM-dd" o ISO completa.
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

export function ExamList({
  exams,
  compact = false,
  onRowClick,
  onUploadClick,
}: ExamListProps) {
  if (exams.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aún no hay exámenes registrados.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {exams.map((exam, index) => {
        const requesterName = personName(
          exam.requested_by_member?.first_name,
          exam.requested_by_member?.last_name
        );
        const dateLabel = formatDate(
          exam.result_date ?? exam.requested_at
        );
        const typeLabel = getExamTypeLabel(exam.type, exam.custom_type_label);
        const isRequested = exam.status === "solicitado";

        return (
          <div key={exam.id}>
            {index > 0 && !compact && <Separator className="mb-3" />}
            <div
              className={
                compact
                  ? "flex flex-wrap items-start justify-between gap-3 rounded-md border border-border/60 bg-background/50 p-3"
                  : "flex flex-wrap items-start justify-between gap-3"
              }
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{typeLabel}</p>
                  <ExamStatusBadge status={exam.status} />
                  {exam.shared_with_tutor_at && (
                    <span className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      Enviado al tutor
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{dateLabel}</span>
                  <span>Vet: {requesterName}</span>
                  {exam.indications && (
                    <span className="line-clamp-1 max-w-md">
                      Indicación: {exam.indications}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {isRequested ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUploadClick?.(exam)}
                  >
                    <Upload className="size-3.5" data-icon="inline-start" />
                    Cargar resultado
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRowClick?.(exam)}
                  >
                    <Eye className="size-3.5" data-icon="inline-start" />
                    Ver
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
