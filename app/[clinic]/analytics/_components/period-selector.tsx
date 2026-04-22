"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { AnalyticsPeriod } from "../queries";

const OPTIONS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: "month", label: "Este mes" },
  { value: "3m", label: "Últimos 90 días" },
  { value: "year", label: "Últimos 12 meses" },
];

export function PeriodSelector({ current }: { current: AnalyticsPeriod }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function change(value: AnalyticsPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div
      role="tablist"
      aria-label="Rango de tiempo"
      className="inline-flex items-center gap-1 rounded-lg border bg-card p-1 text-sm shadow-sm"
      data-pending={isPending ? "true" : "false"}
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === current;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => change(opt.value)}
            className={
              active
                ? "rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground"
                : "rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground"
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
