"use client";

import Link from "next/link";
import { Clock, Pill } from "lucide-react";
import { CollapsibleSection } from "@/components/ui/collapsible";
import type { PatientContext } from "@/app/[clinic]/clients/[id]/pets/[petId]/records/actions";

interface PatientContextCardProps {
  context: PatientContext;
  clinicSlug: string;
  clientId: string;
  petId: string;
}

function formatDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysAgo(iso: string): number {
  const d = new Date(iso + "T12:00:00");
  const now = new Date();
  const diff = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff;
}

export function PatientContextCard({
  context,
  clinicSlug,
  clientId,
  petId,
}: PatientContextCardProps) {
  const { lastRecord, lastPrescriptions } = context;
  if (!lastRecord) return null;

  const days = daysAgo(lastRecord.date);
  const daysLabel =
    days <= 0
      ? "hoy"
      : days === 1
        ? "hace 1 día"
        : days < 30
          ? `hace ${days} días`
          : days < 60
            ? "hace 1 mes"
            : `hace ${Math.floor(days / 30)} meses`;

  const title = `Última consulta ${daysLabel}`;
  const preview = [
    lastRecord.reason,
    lastRecord.diagnosis,
    lastRecord.weight != null ? `${lastRecord.weight} kg` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const hasMeds = lastPrescriptions.length > 0;

  return (
    <CollapsibleSection
      title={title}
      defaultOpen
      hasContent
      preview={preview}
    >
      <div className="space-y-4 text-sm">
        <div className="flex items-start gap-2 text-muted-foreground">
          <Clock className="size-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">
              {formatDate(lastRecord.date)}
            </p>
            <p className="text-xs">Veterinario: {lastRecord.vet_name}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {lastRecord.reason && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Motivo
              </p>
              <p className="whitespace-pre-wrap">{lastRecord.reason}</p>
            </div>
          )}
          {lastRecord.diagnosis && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Diagnóstico
              </p>
              <p className="whitespace-pre-wrap">{lastRecord.diagnosis}</p>
            </div>
          )}
          {lastRecord.weight != null && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Peso anterior
              </p>
              <p>{lastRecord.weight} kg</p>
            </div>
          )}
        </div>

        {hasMeds && (
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
              <Pill className="size-3.5" />
              Medicamentos recetados en esa consulta
            </p>
            <ul className="space-y-1.5">
              {lastPrescriptions.map((p) => (
                <li key={p.id} className="text-sm">
                  <span className="font-medium">{p.medication}</span>
                  {p.dose && (
                    <span className="text-muted-foreground"> · {p.dose}</span>
                  )}
                  {p.frequency && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {p.frequency}
                    </span>
                  )}
                  {p.duration && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {p.duration}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Verifica con el tutor si aún sigue con el tratamiento.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Link
            href={`/${clinicSlug}/clients/${clientId}/pets/${petId}/records/${lastRecord.id}`}
            className="text-xs text-primary hover:underline"
          >
            Ver ficha completa →
          </Link>
        </div>
      </div>
    </CollapsibleSection>
  );
}
