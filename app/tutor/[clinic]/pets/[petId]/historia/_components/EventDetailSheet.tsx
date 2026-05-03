"use client";

import {
  Syringe,
  Bug,
  Stethoscope,
  Microscope,
  Scissors,
  Cake,
  PawPrint,
  Sparkles,
  Star,
  Moon,
  ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  formatLongDate,
  formatAge,
  type TimelineEvent as TEvent,
} from "../_lib/timeline";

const ICONS: Record<TEvent["kind"], LucideIcon> = {
  vaccination: Syringe,
  deworming: Bug,
  medical_consult: Stethoscope,
  exam: Microscope,
  grooming: Scissors,
  birthday: Cake,
  welcome: PawPrint,
  birth: Sparkles,
  anniversary: Star,
  final_rest: Moon,
};

const EXAM_LABELS: Record<string, string> = {
  hemograma: "Hemograma",
  perfil_bioquimico: "Perfil bioquímico",
  urianalisis: "Urianálisis",
  rayos_x: "Rayos X",
  ecografia: "Ecografía",
  citologia: "Citología",
  biopsia: "Biopsia",
  otro: "Otro",
};

type Props = {
  event: TEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petName: string;
  birthdate: string | null;
  clinicSlug: string;
  petId: string;
};

function detailTitle(ev: TEvent): string {
  switch (ev.kind) {
    case "vaccination":
      return `Vacuna ${ev.data.vaccine_name}`;
    case "deworming":
      return `Desparasitación ${ev.data.type === "interna" ? "interna" : "externa"}`;
    case "medical_consult":
      return ev.data.vetName
        ? `Consulta con ${ev.data.vetName}`
        : "Consulta médica";
    case "exam": {
      const label =
        ev.data.type === "otro" && ev.data.custom_type_label
          ? ev.data.custom_type_label
          : EXAM_LABELS[ev.data.type] ?? ev.data.type;
      return `Examen ${label.toLowerCase()}`;
    }
    case "grooming":
      return ev.data.service_performed?.trim() || "Servicio de peluquería";
    case "birthday":
      return `¡${ev.data.petName} cumplió ${ev.data.age} ${ev.data.age === 1 ? "año" : "años"}!`;
    case "welcome":
      return `Bienvenido a ${ev.data.clinicName}`;
    case "birth":
      return `${ev.data.petName} nació`;
    case "anniversary":
      return `${ev.data.years} ${ev.data.years === 1 ? "año" : "años"} en ${ev.data.clinicName}`;
    case "final_rest":
      return `${ev.data.petName} descansó`;
  }
}

export function EventDetailSheet({
  event,
  open,
  onOpenChange,
  petName,
  birthdate,
  clinicSlug,
  petId,
}: Props) {
  if (!event) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] sm:max-w-md sm:rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Detalle</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const Icon = ICONS[event.kind];
  const ageLine =
    event.kind === "birth"
      ? null
      : formatAge(birthdate, event.date, petName);
  const longDate = formatLongDate(event.date);
  const title = detailTitle(event);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-2xl sm:max-w-md sm:rounded-t-2xl"
      >
        <SheetHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Icon className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg leading-tight">{title}</SheetTitle>
              <SheetDescription>
                {longDate}
                {ageLine ? <> · {ageLine}</> : null}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6 text-sm">
          <DetailBody
            event={event}
            clinicSlug={clinicSlug}
            petId={petId}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailBody({
  event,
  clinicSlug,
  petId,
}: {
  event: TEvent;
  clinicSlug: string;
  petId: string;
}) {
  switch (event.kind) {
    case "vaccination":
      return (
        <div className="space-y-2">
          <DetailRow label="Vacuna" value={event.data.vaccine_name} />
          {event.data.administered_by ? (
            <DetailRow label="Aplicada por" value={event.data.administered_by} />
          ) : null}
          {event.data.lot_number ? (
            <DetailRow label="Lote" value={event.data.lot_number} />
          ) : null}
          {event.data.next_due_date ? (
            <DetailRow
              label="Próxima dosis"
              value={formatDay(event.data.next_due_date)}
            />
          ) : null}
        </div>
      );
    case "deworming":
      return (
        <div className="space-y-2">
          <DetailRow
            label="Tipo"
            value={
              event.data.type === "interna"
                ? "Desparasitación interna"
                : "Desparasitación externa"
            }
          />
          {event.data.product ? (
            <DetailRow label="Producto" value={event.data.product} />
          ) : null}
          {event.data.next_due_date ? (
            <DetailRow
              label="Próxima dosis"
              value={formatDay(event.data.next_due_date)}
            />
          ) : null}
        </div>
      );
    case "medical_consult":
      return (
        <p className="text-muted-foreground">
          Esta consulta es parte de tu historia clínica.
          {event.data.vetName ? <> Te atendió {event.data.vetName}.</> : null}
        </p>
      );
    case "exam":
      return (
        <div className="space-y-3">
          <p className="text-muted-foreground">Examen disponible para ti.</p>
          {event.data.vet_interpretation ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              {event.data.vet_interpretation}
            </div>
          ) : null}
          <Button
            variant="outline"
            className="w-full"
            render={
              <a
                href={`/api/tutor/${clinicSlug}/exams/${event.data.id}/file`}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <ExternalLink className="size-4" data-icon="inline-start" />
            Ver examen
          </Button>
        </div>
      );
    case "grooming":
      return (
        <div className="space-y-2">
          {event.data.groomerName ? (
            <DetailRow
              label="Realizado por"
              value={event.data.groomerName}
            />
          ) : null}
          {event.data.observations ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              {event.data.observations}
            </div>
          ) : null}
        </div>
      );
    case "birthday":
      return (
        <p className="text-muted-foreground">
          Un año más juntos. {event.data.petName} cumple {event.data.age}{" "}
          {event.data.age === 1 ? "año" : "años"} de aventuras contigo.
        </p>
      );
    case "welcome":
      return (
        <p className="text-muted-foreground">
          Aquí empieza la historia de {event.data.petName} en{" "}
          {event.data.clinicName}. Cada visita, vacuna y momento se irá
          guardando en este lugar.
        </p>
      );
    case "birth":
      return (
        <p className="text-muted-foreground">
          El día que todo comenzó. {event.data.petName} llegó al mundo.
        </p>
      );
    case "anniversary":
      return (
        <p className="text-muted-foreground">
          {event.data.years}{" "}
          {event.data.years === 1 ? "año" : "años"} cuidando a{" "}
          {event.data.petName} junto a {event.data.clinicName}.
        </p>
      );
    case "final_rest":
      return (
        <p className="italic text-muted-foreground">
          {event.data.petName} dejó una huella imborrable. Esta historia
          siempre será suya.
        </p>
      );
  }

  // Visita auxiliar para evitar uso del param
  void petId;
  return null;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/40 pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function formatDay(dayStr: string): string {
  return new Date(dayStr + "T12:00:00").toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
