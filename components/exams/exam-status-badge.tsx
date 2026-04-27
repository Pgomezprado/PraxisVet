import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ExamStatus } from "@/types";

interface ExamStatusBadgeProps {
  status: ExamStatus;
  className?: string;
}

export function ExamStatusBadge({ status, className }: ExamStatusBadgeProps) {
  if (status === "solicitado") {
    return (
      <Badge variant="outline" className={cn("font-medium", className)}>
        Solicitado
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
        className
      )}
    >
      Resultado cargado
    </Badge>
  );
}
