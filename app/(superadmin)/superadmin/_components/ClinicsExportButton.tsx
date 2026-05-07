"use client";

import { Download } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";

type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "expired"
  | "cancelled"
  | null;

export type ClinicExportRow = {
  org_id: string;
  org_name: string;
  org_slug: string;
  org_plan: string;
  org_created_at: string;
  total_members: number;
  active_members_7d: number;
  last_sign_in_at: string | null;
  consultations_7d: number;
  pets_count: number;
  alert_level: "zombie" | "team_inactive" | "ok";
  tutors_count: number;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  is_founder: boolean;
};

const HEADERS = [
  "Clínica",
  "Slug",
  "Plan",
  "Estado",
  "Tutores",
  "Pacientes",
  "Miembros",
  "Activos 7d",
  "Consultas 7d",
  "Último login",
  "Trial vence",
  "Fundadora",
  "Alerta",
];

const STATUS_LABEL: Record<NonNullable<SubscriptionStatus>, string> = {
  trial: "En prueba",
  active: "Activo",
  past_due: "Pago pendiente",
  expired: "Expirado",
  cancelled: "Cancelado",
};

const ALERT_LABEL: Record<ClinicExportRow["alert_level"], string> = {
  zombie: "Zombie",
  team_inactive: "Equipo no activado",
  ok: "OK",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return format(new Date(iso), "dd-MM-yyyy");
  } catch {
    return "";
  }
}

function escapeCell(value: string | number | boolean): string {
  const str = String(value ?? "");
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(rows: ClinicExportRow[]): string {
  const lines: string[] = [];
  lines.push(HEADERS.map(escapeCell).join(","));
  for (const r of rows) {
    const cells = [
      r.org_name,
      r.org_slug,
      r.org_plan,
      r.subscription_status ? STATUS_LABEL[r.subscription_status] : "",
      r.tutors_count,
      r.pets_count,
      r.total_members,
      r.active_members_7d,
      r.consultations_7d,
      fmtDate(r.last_sign_in_at),
      fmtDate(r.trial_ends_at),
      r.is_founder ? "Sí" : "No",
      ALERT_LABEL[r.alert_level],
    ];
    lines.push(cells.map(escapeCell).join(","));
  }
  return lines.join("\n");
}

export function ClinicsExportButton({ rows }: { rows: ClinicExportRow[] }) {
  const disabled = rows.length === 0;

  function handleClick() {
    if (disabled) return;
    const csv = buildCsv(rows);
    // BOM para que Excel reconozca UTF-8
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const today = format(new Date(), "yyyy-MM-dd");
    const a = document.createElement("a");
    a.href = url;
    a.download = `clinicas-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={handleClick}
      title={
        disabled
          ? "No hay clínicas para exportar"
          : `Exportar ${rows.length} ${rows.length === 1 ? "clínica" : "clínicas"} a CSV`
      }
    >
      <Download className="h-3.5 w-3.5" />
      Exportar CSV
    </Button>
  );
}
