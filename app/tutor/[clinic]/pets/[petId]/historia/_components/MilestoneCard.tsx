import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  subtitle?: string | null;
  ageLine?: string | null;
  relativeDate: string;
  className?: string;
};

/**
 * Card de hito (cumpleaños, aniversario, bienvenida, nacimiento, cierre).
 * Visualmente diferenciada con gradiente verde forestal sutil.
 */
export function MilestoneCard({
  icon: Icon,
  title,
  subtitle,
  ageLine,
  relativeDate,
  className,
}: Props) {
  return (
    <Card
      className={cn(
        "border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card ring-1 ring-primary/20",
        className
      )}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="font-heading text-base font-semibold leading-tight">
              {title}
            </p>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {relativeDate}
            </span>
          </div>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
          {ageLine ? (
            <p className="mt-1 text-xs italic text-muted-foreground/80">
              {ageLine}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
