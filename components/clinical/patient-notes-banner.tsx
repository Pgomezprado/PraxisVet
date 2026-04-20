import { AlertTriangle } from "lucide-react";

interface PatientNotesBannerProps {
  notes: string | null | undefined;
}

export function PatientNotesBanner({ notes }: PatientNotesBannerProps) {
  const trimmed = notes?.trim();
  if (!trimmed) return null;

  return (
    <div className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Notas del paciente
        </p>
        <p className="whitespace-pre-wrap text-amber-900 dark:text-amber-100">
          {trimmed}
        </p>
      </div>
    </div>
  );
}
