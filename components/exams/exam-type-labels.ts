import type { ExamType } from "@/types";

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  hemograma: "Hemograma",
  perfil_bioquimico: "Perfil bioquímico",
  urianalisis: "Urianálisis",
  rayos_x: "Rayos X",
  ecografia: "Ecografía",
  citologia: "Citología",
  biopsia: "Biopsia",
  otro: "Otro",
};

export const EXAM_TYPE_OPTIONS: { value: ExamType; label: string }[] = [
  { value: "hemograma", label: "Hemograma" },
  { value: "perfil_bioquimico", label: "Perfil bioquímico" },
  { value: "urianalisis", label: "Urianálisis" },
  { value: "rayos_x", label: "Rayos X" },
  { value: "ecografia", label: "Ecografía" },
  { value: "citologia", label: "Citología" },
  { value: "biopsia", label: "Biopsia" },
  { value: "otro", label: "Otro" },
];

export function getExamTypeLabel(
  type: ExamType,
  customLabel?: string | null
): string {
  if (type === "otro" && customLabel && customLabel.trim().length > 0) {
    return customLabel.trim();
  }
  return EXAM_TYPE_LABELS[type];
}

// Paleta verde forestal (consistente con la marca PraxisVet) para diferenciar
// tipos sin romper el dark mode.
export const EXAM_TYPE_COLORS: Record<ExamType, string> = {
  hemograma:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  perfil_bioquimico:
    "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  urianalisis:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  rayos_x:
    "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
  ecografia:
    "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  citologia:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  biopsia:
    "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  otro: "bg-muted text-foreground",
};
