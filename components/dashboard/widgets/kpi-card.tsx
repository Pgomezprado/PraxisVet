import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export type KpiTone = "teal" | "amber" | "sky" | "rose" | "emerald";

const toneStyles: Record<KpiTone, { bg: string; text: string; border: string }> = {
  teal: { bg: "bg-primary/10", text: "text-primary", border: "border-l-primary" },
  amber: {
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-l-orange-500",
  },
  sky: {
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-l-sky-500",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-l-rose-500",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-l-emerald-500",
  },
};

export function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "teal",
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  tone?: KpiTone;
}) {
  const styles = toneStyles[tone];
  return (
    <Card className={`border-l-4 ${styles.border}`}>
      <CardContent className="flex items-center gap-4 py-5">
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${styles.bg}`}
        >
          <Icon className={`size-6 ${styles.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
