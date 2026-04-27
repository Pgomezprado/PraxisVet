"use client";

import { useMemo, useState } from "react";
import { FlaskConical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ExamList } from "@/components/exams/exam-list";
import {
  EXAM_TYPE_OPTIONS,
} from "@/components/exams/exam-type-labels";
import type { ExamWithPeople } from "@/components/exams/types";
import type { ExamType } from "@/types";
import { RequestExamSheet } from "./request-exam-sheet";
import { UploadResultSheet } from "./upload-result-sheet";
import { ExamViewerDrawer } from "./exam-viewer-drawer";

interface ExamsPageClientProps {
  exams: ExamWithPeople[];
  orgId: string;
  petId: string;
  clientId: string;
  clinicSlug: string;
  canInterpret: boolean;
  canDelete: boolean;
}

type FilterValue = "all" | ExamType;

export function ExamsPageClient({
  exams,
  orgId,
  petId,
  clientId,
  clinicSlug,
  canInterpret,
  canDelete,
}: ExamsPageClientProps) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [viewerExam, setViewerExam] = useState<ExamWithPeople | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [uploadExamId, setUploadExamId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return exams;
    return exams.filter((e) => e.type === filter);
  }, [exams, filter]);

  function openViewer(exam: ExamWithPeople) {
    setViewerExam(exam);
    setViewerOpen(true);
  }

  function openUpload(examId: string) {
    setUploadExamId(examId);
  }

  if (exams.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <FlaskConical className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Aún no hay exámenes para esta mascota.
          </p>
          <RequestExamSheet
            orgId={orgId}
            petId={petId}
            clientId={clientId}
            clinicSlug={clinicSlug}
            triggerLabel="Solicitar primer examen"
            triggerVariant="outline"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-4 py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="exam_filter"
                className="text-xs text-muted-foreground"
              >
                Filtrar por tipo
              </Label>
              <Select
                id="exam_filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterValue)}
                className="w-auto"
              >
                <option value="all">Todos</option>
                {EXAM_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <p className="ml-auto text-xs text-muted-foreground">
              {filtered.length}{" "}
              {filtered.length === 1 ? "examen" : "exámenes"}
            </p>
          </div>

          <ExamList
            exams={filtered}
            canInterpret={canInterpret}
            canDelete={canDelete}
            onRowClick={openViewer}
            onUploadClick={(exam) => openUpload(exam.id)}
          />
        </CardContent>
      </Card>

      <ExamViewerDrawer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        exam={viewerExam}
        orgId={orgId}
        petId={petId}
        clientId={clientId}
        clinicSlug={clinicSlug}
        canInterpret={canInterpret}
        canDelete={canDelete}
      />

      {uploadExamId && (
        <UploadResultSheet
          open={!!uploadExamId}
          onOpenChange={(open) => {
            if (!open) setUploadExamId(null);
          }}
          orgId={orgId}
          petId={petId}
          clientId={clientId}
          clinicSlug={clinicSlug}
          examId={uploadExamId}
          canInterpret={canInterpret}
        />
      )}
    </>
  );
}
