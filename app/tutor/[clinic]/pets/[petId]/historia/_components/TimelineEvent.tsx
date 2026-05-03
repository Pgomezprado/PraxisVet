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
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  formatRelativeDate,
  formatAge,
  type DayGroup,
  type TimelineEvent as TEvent,
} from "../_lib/timeline";
import { MilestoneCard } from "./MilestoneCard";

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

function eventTitle(ev: TEvent): string {
  switch (ev.kind) {
    case "vaccination":
      return `Vacuna ${ev.data.vaccine_name}`;
    case "deworming":
      return `Desparasitación ${ev.data.type === "interna" ? "interna" : "externa"}`;
    case "medical_consult":
      return ev.data.vetName
        ? `Consulta médica con ${ev.data.vetName}`
        : "Consulta médica";
    case "exam": {
      const label =
        ev.data.type === "otro" && ev.data.custom_type_label
          ? ev.data.custom_type_label
          : EXAM_LABELS[ev.data.type] ?? ev.data.type;
      return `Examen ${label.toLowerCase()}`;
    }
    case "grooming": {
      const raw = ev.data.service_performed?.trim();
      if (!raw) return "Servicio de peluquería";
      // Normalizar a sentence case si viene en MAYÚSCULAS o con tipografía rara.
      if (raw === raw.toUpperCase() && raw.length > 3) {
        return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      }
      return raw;
    }
    case "birthday":
      return `¡${ev.data.petName} cumplió ${ev.data.age} ${ev.data.age === 1 ? "año" : "años"}!`;
    case "welcome":
      return `Bienvenido a ${ev.data.clinicName}`;
    case "birth":
      return `${ev.data.petName} nació`;
    case "anniversary":
      return `${ev.data.years} ${ev.data.years === 1 ? "año" : "años"} contigo en ${ev.data.clinicName}`;
    case "final_rest":
      return `${ev.data.petName} descansó`;
  }
}

function eventSubtitle(ev: TEvent): string | null {
  switch (ev.kind) {
    case "vaccination":
      return ev.data.administered_by
        ? `Aplicada por ${ev.data.administered_by}`
        : null;
    case "deworming":
      return ev.data.product ? `Producto: ${ev.data.product}` : null;
    case "medical_consult":
      return "Esta consulta es parte de tu historia clínica.";
    case "exam":
      return "Examen disponible para ti";
    case "grooming":
      return ev.data.observations ? ev.data.observations : null;
    default:
      return null;
  }
}

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
  group: DayGroup;
  birthdate: string | null;
  petName: string;
  isFirst: boolean;
  isLast: boolean;
  /** Llamado al click — abre Sheet de detalle. */
  onSelect: (event: TEvent) => void;
};

/**
 * Renderiza un grupo de día en el timeline. Si el grupo tiene 1 evento, muestra
 * un card directo. Si tiene 2+ y no es solo hitos, muestra un card "Visita completa"
 * con sub-eventos. Los hitos siempre van como MilestoneCard.
 */
export function TimelineEventGroup({
  group,
  birthdate,
  petName,
  isFirst,
  isLast,
  onSelect,
}: Props) {
  const milestones = group.events.filter((e) => e.category === "hito");
  const reals = group.events.filter((e) => e.category !== "hito");

  // Render: hitos primero (cada uno su MilestoneCard), después reales (uno o agrupados)
  return (
    <div className="flex gap-3">
      <RailColumn
        isFirst={isFirst}
        isLast={isLast}
        hasMilestone={milestones.length > 0}
      />
      <div className="min-w-0 flex-1 space-y-3 pb-4">
        {milestones.map((ev, idx) => (
          <MilestoneCard
            key={`${ev.kind}-${idx}-${group.dayKey}`}
            icon={ICONS[ev.kind]}
            title={eventTitle(ev)}
            subtitle={eventSubtitle(ev)}
            ageLine={
              ev.kind === "birth"
                ? null
                : formatAge(birthdate, ev.date, petName)
            }
            relativeDate={formatRelativeDate(ev.date)}
          />
        ))}

        {reals.length === 1 ? (
          <SingleEventCard
            event={reals[0]}
            birthdate={birthdate}
            petName={petName}
            onSelect={onSelect}
          />
        ) : reals.length > 1 ? (
          <MultiEventCard
            events={reals}
            date={group.date}
            birthdate={birthdate}
            petName={petName}
            onSelect={onSelect}
          />
        ) : null}
      </div>
    </div>
  );
}

function RailColumn({
  isFirst,
  isLast,
  hasMilestone,
}: {
  isFirst: boolean;
  isLast: boolean;
  hasMilestone: boolean;
}) {
  return (
    <div className="relative w-4 shrink-0">
      <span
        aria-hidden
        className={cn(
          "absolute left-1/2 -translate-x-1/2 w-px bg-border/50",
          isFirst ? "top-6" : "top-0",
          isLast ? "h-6" : "h-full"
        )}
      />
      <span
        aria-hidden
        className={cn(
          "absolute left-1/2 top-6 -translate-x-1/2 -translate-y-1/2 size-2.5 rounded-full ring-4 ring-background",
          hasMilestone ? "bg-primary" : "bg-muted-foreground/50"
        )}
      />
    </div>
  );
}

function SingleEventCard({
  event,
  birthdate,
  petName,
  onSelect,
}: {
  event: TEvent;
  birthdate: string | null;
  petName: string;
  onSelect: (e: TEvent) => void;
}) {
  const Icon = ICONS[event.kind];
  const title = eventTitle(event);
  const subtitle = eventSubtitle(event);
  const ageLine = formatAge(birthdate, event.date, petName);
  const relative = formatRelativeDate(event.date);

  return (
    <Card className="cursor-pointer transition-colors hover:bg-muted/40">
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => onSelect(event)}
        aria-label={`Ver detalle: ${title}`}
      >
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-sm font-medium leading-tight">{title}</p>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {relative}
              </span>
            </div>
            {subtitle ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
            {ageLine ? (
              <p className="mt-1 text-[11px] italic text-muted-foreground/70">
                {ageLine}
              </p>
            ) : null}
          </div>
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground/60" />
        </CardContent>
      </button>
    </Card>
  );
}

function MultiEventCard({
  events,
  date,
  birthdate,
  petName,
  onSelect,
}: {
  events: TEvent[];
  date: Date;
  birthdate: string | null;
  petName: string;
  onSelect: (e: TEvent) => void;
}) {
  const ageLine = formatAge(birthdate, date, petName);
  const relative = formatRelativeDate(date);
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium">Visita completa</p>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {relative}
          </span>
        </div>
        {ageLine ? (
          <p className="text-[11px] italic text-muted-foreground/70">
            {ageLine}
          </p>
        ) : null}
        <ul className="divide-y divide-border/60">
          {events.map((ev, idx) => {
            const Icon = ICONS[ev.kind];
            const subtitle = eventSubtitle(ev);
            return (
              <li key={`${ev.kind}-${idx}`}>
                <button
                  type="button"
                  onClick={() => onSelect(ev)}
                  className="flex w-full items-start gap-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-tight">{eventTitle(ev)}</p>
                    {subtitle ? (
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">
                        {subtitle}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
