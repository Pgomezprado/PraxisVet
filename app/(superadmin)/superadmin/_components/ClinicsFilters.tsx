"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ClinicsSearch } from "./ClinicsSearch";

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "trial", label: "En prueba" },
  { value: "active", label: "Activo" },
  { value: "past_due", label: "Pago pendiente" },
  { value: "expired", label: "Expirado" },
  { value: "cancelled", label: "Cancelado" },
] as const;

const PLAN_OPTIONS = [
  { value: "", label: "Todos los planes" },
  { value: "free", label: "Free" },
  { value: "basico", label: "Básico" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
] as const;

const RISK_OPTIONS = [
  { value: "", label: "Todos los riesgos" },
  { value: "zombie", label: "Zombie" },
  { value: "team_inactive", label: "Equipo no activado" },
  { value: "ok", label: "OK" },
] as const;

const FOUNDER_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "yes", label: "Fundadoras" },
  { value: "no", label: "No fundadoras" },
] as const;

export type ClinicsFiltersState = {
  status: string;
  plan: string;
  risk: string;
  founder: string;
};

export function ClinicsFilters({
  total,
  filtered,
  exportSlot,
}: {
  total: number;
  filtered: number;
  exportSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const status = params.get("status") ?? "";
  const plan = params.get("plan") ?? "";
  const risk = params.get("risk") ?? "";
  const founder = params.get("founder") ?? "";
  const q = params.get("q") ?? "";

  const hasFilters = !!(status || plan || risk || founder || q);

  function update(key: keyof ClinicsFiltersState, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `/superadmin/clinicas?${qs}` : "/superadmin/clinicas");
    });
  }

  function clearAll() {
    startTransition(() => {
      router.replace("/superadmin/clinicas");
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <ClinicsSearch />
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Estado
          </span>
          <Select
            value={status}
            disabled={pending}
            onChange={(e) => update("status", e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Plan
          </span>
          <Select
            value={plan}
            disabled={pending}
            onChange={(e) => update("plan", e.target.value)}
          >
            {PLAN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Riesgo
          </span>
          <Select
            value={risk}
            disabled={pending}
            onChange={(e) => update("risk", e.target.value)}
          >
            {RISK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Fundadoras
          </span>
          <Select
            value={founder}
            disabled={pending}
            onChange={(e) => update("founder", e.target.value)}
          >
            {FOUNDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {hasFilters ? (
            <>
              Mostrando <span className="font-mono">{filtered}</span> de{" "}
              <span className="font-mono">{total}</span> clínicas
            </>
          ) : (
            <>
              <span className="font-mono">{total}</span>{" "}
              {total === 1 ? "clínica" : "clínicas"}
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button
              variant="ghost"
              size="xs"
              disabled={pending}
              onClick={clearAll}
            >
              Limpiar filtros
            </Button>
          )}
          {exportSlot}
        </div>
      </div>
    </div>
  );
}
