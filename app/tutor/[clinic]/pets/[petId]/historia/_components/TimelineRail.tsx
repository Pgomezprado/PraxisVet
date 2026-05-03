import { cn } from "@/lib/utils";

type Props = {
  /** Si es el primero o último, recortamos el rail. */
  isFirst?: boolean;
  isLast?: boolean;
  /** Estilo de hito (verde primary) o evento normal (border). */
  variant?: "default" | "milestone";
};

/**
 * Carril vertical de timeline + dot. Renderiza una línea de 2px y un punto
 * de 10px centrado a la altura del primer renglón del card adyacente.
 */
export function TimelineRail({
  isFirst = false,
  isLast = false,
  variant = "default",
}: Props) {
  return (
    <div className="relative w-6 shrink-0">
      {/* Línea vertical */}
      <span
        aria-hidden
        className={cn(
          "absolute left-1/2 -translate-x-1/2 w-px bg-border/60",
          isFirst ? "top-5" : "top-0",
          isLast ? "h-5" : "h-full"
        )}
      />
      {/* Dot */}
      <span
        aria-hidden
        className={cn(
          "absolute left-1/2 top-5 -translate-x-1/2 -translate-y-1/2 size-2.5 rounded-full ring-4 ring-background",
          variant === "milestone"
            ? "bg-primary"
            : "bg-muted-foreground/40"
        )}
      />
    </div>
  );
}
