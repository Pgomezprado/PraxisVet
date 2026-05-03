"use client";

import { useMemo, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterChips } from "./FilterChips";
import { YearSection } from "./YearSection";
import { TimelineEventGroup } from "./TimelineEvent";
import { EventDetailSheet } from "./EventDetailSheet";
import {
  type TimelineEvent as TEvent,
  type TimelineFilter,
  applyFilter,
  buildSections,
  groupByDay,
} from "../_lib/timeline";

type SerializedEvent = Omit<TEvent, "date"> & { dateIso: string };

type Props = {
  events: SerializedEvent[];
  petName: string;
  birthdate: string | null;
  clinicSlug: string;
  petId: string;
};

/**
 * Cliente: filtros + secciones colapsables + detalle.
 * Recibe eventos serializados (date como string) y los rehidrata a Date.
 */
export function HistoriaTimeline({
  events: serialized,
  petName,
  birthdate,
  clinicSlug,
  petId,
}: Props) {
  const [filter, setFilter] = useState<TimelineFilter>("todos");
  const [selected, setSelected] = useState<TEvent | null>(null);
  const [open, setOpen] = useState(false);

  const events: TEvent[] = useMemo(
    () =>
      serialized.map((e) => ({
        ...e,
        date: new Date(e.dateIso),
      })) as TEvent[],
    [serialized]
  );

  const counts = useMemo(() => {
    const c = { todos: 0, salud: 0, belleza: 0, hito: 0 } as Record<
      TimelineFilter,
      number
    >;
    for (const ev of events) {
      c.todos += 1;
      c[ev.category] += 1;
    }
    return c;
  }, [events]);

  const sections = useMemo(() => {
    const groups = groupByDay(events);
    const filtered = applyFilter(groups, filter);
    return buildSections(filtered);
  }, [events, filter]);

  function handleSelect(ev: TEvent) {
    setSelected(ev);
    setOpen(true);
  }

  function scrollToTop() {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <>
      <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
        <FilterChips active={filter} onChange={setFilter} counts={counts} />
      </div>

      <div className="mt-4 space-y-6">
        {sections.length === 0 ? (
          <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            No hay momentos en esta categoría todavía.
          </p>
        ) : null}

        {sections.map((section) => {
          // Total de eventos visibles en sección, para el contador
          const total = section.groups.reduce(
            (sum, g) => sum + g.events.length,
            0
          );
          // Marcadores de primer/último para el rail visual
          const flat = section.groups;
          return (
            <YearSection
              key={section.id}
              label={section.id === "hoy" ? "Hoy" : section.label}
              count={total}
              alwaysOpen={section.alwaysOpen}
              defaultOpen={section.defaultOpen}
            >
              {flat.map((group, idx) => (
                <TimelineEventGroup
                  key={group.dayKey + ":" + idx}
                  group={group}
                  birthdate={birthdate}
                  petName={petName}
                  isFirst={idx === 0}
                  isLast={idx === flat.length - 1}
                  onSelect={handleSelect}
                />
              ))}
            </YearSection>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center">
        <Button variant="ghost" size="sm" onClick={scrollToTop}>
          <ArrowUp className="size-4" data-icon="inline-start" />
          Ir al inicio
        </Button>
      </div>

      <EventDetailSheet
        event={selected}
        open={open}
        onOpenChange={setOpen}
        petName={petName}
        birthdate={birthdate}
        clinicSlug={clinicSlug}
        petId={petId}
      />
    </>
  );
}
