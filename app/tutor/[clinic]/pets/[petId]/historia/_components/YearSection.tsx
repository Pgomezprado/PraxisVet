"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  count: number;
  alwaysOpen?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

/**
 * Encabezado colapsable de sección de timeline.
 * - alwaysOpen: el header se muestra plano sin chevron, siempre abierto.
 * - defaultOpen: estado inicial cuando es colapsable.
 */
export function YearSection({
  label,
  count,
  alwaysOpen = false,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(alwaysOpen || defaultOpen);
  const isCollapsible = !alwaysOpen;

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => isCollapsible && setOpen((p) => !p)}
        disabled={!isCollapsible}
        className={cn(
          "group flex w-full items-center justify-between gap-3 rounded-md py-1.5 text-left",
          isCollapsible && "cursor-pointer hover:opacity-80"
        )}
        aria-expanded={open}
      >
        <div className="flex items-baseline gap-2">
          <h2
            className={cn(
              "font-heading uppercase tracking-wider",
              alwaysOpen
                ? "text-xs font-semibold text-primary"
                : "text-sm font-semibold text-foreground"
            )}
          >
            {label}
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            ({count})
          </span>
        </div>
        {isCollapsible ? (
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        ) : null}
      </button>
      {open ? <div className="space-y-0">{children}</div> : null}
    </section>
  );
}
