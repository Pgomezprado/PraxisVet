"use client";

import { cn } from "@/lib/utils";
import type { TimelineFilter } from "../_lib/timeline";

const FILTERS: { id: TimelineFilter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "salud", label: "Salud" },
  { id: "belleza", label: "Belleza" },
  { id: "hito", label: "Hitos" },
];

type Props = {
  active: TimelineFilter;
  onChange: (filter: TimelineFilter) => void;
  counts: Record<TimelineFilter, number>;
};

export function FilterChips({ active, onChange, counts }: Props) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {FILTERS.map((f) => {
        const isActive = active === f.id;
        const count = counts[f.id];
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted/60"
            )}
            aria-pressed={isActive}
          >
            {f.label}
            <span
              className={cn(
                "ml-1.5 rounded-full px-1.5 py-px text-[10px] tabular-nums",
                isActive
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
