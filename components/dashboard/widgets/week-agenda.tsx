import Image from "next/image";
import Link from "next/link";
import { format, parseISO, isToday as dfnsIsToday } from "date-fns";
import { es } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CalendarDays,
  CalendarRange,
  Stethoscope,
  Scissors,
} from "lucide-react";
import { formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { isTerminalStatus } from "@/components/appointments/status-badge";
import type { TodayAppointment } from "@/app/[clinic]/dashboard/queries";
import type { AppointmentStatus } from "@/types/database";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pendiente", variant: "outline" },
  confirmed: { label: "Confirmada", variant: "default" },
  in_progress: { label: "En curso", variant: "secondary" },
  ready_for_pickup: { label: "Listo", variant: "secondary" },
  completed: { label: "Completada", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  no_show: { label: "No asistió", variant: "destructive" },
};

export function WeekAgenda({
  title = "Mi agenda de la semana",
  description,
  appointments,
  emptyTitle,
  emptyDescription,
  emptyAction,
  clinicSlug,
}: {
  title?: string;
  description?: string;
  appointments: TodayAppointment[];
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: { label: string; href: string };
  clinicSlug: string;
}) {
  const empty = appointments.length === 0;

  // Agrupar por fecha (YYYY-MM-DD), preservando el orden original (date asc → start_time asc).
  const grouped = appointments.reduce<Map<string, TodayAppointment[]>>(
    (acc, apt) => {
      const list = acc.get(apt.date) ?? [];
      list.push(apt);
      acc.set(apt.date, list);
      return acc;
    },
    new Map()
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="size-5 text-primary" />
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </div>
          {!empty && (
            <Link href={`/${clinicSlug}/appointments?view=week`}>
              <Button variant="ghost" size="sm" className="gap-1">
                Ver semana completa
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          )}
        </div>
        <CardDescription>
          {empty
            ? "Visualiza tu carga de la semana de un vistazo"
            : description ??
              `${appointments.length} cita${appointments.length > 1 ? "s" : ""} de lunes a domingo`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-primary/5 py-10 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
              <CalendarDays className="size-7 text-primary" />
            </div>
            <p className="text-sm font-medium">{emptyTitle}</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              {emptyDescription}
            </p>
            {emptyAction && (
              <Link href={emptyAction.href} className="mt-4">
                <Button size="sm" className="gap-2">
                  <CalendarDays className="size-3.5" />
                  {emptyAction.label}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="max-h-[480px] space-y-4 overflow-y-auto pr-1">
            {Array.from(grouped.entries()).map(([dateStr, dayApts]) => {
              const dateObj = parseISO(dateStr + "T12:00:00");
              const isToday = dfnsIsToday(dateObj);
              const dayLabel = format(dateObj, "EEEE d 'de' MMM", {
                locale: es,
              });
              return (
                <div key={dateStr} className="space-y-2">
                  <div className="flex items-center gap-2 sticky top-0 bg-card pb-1">
                    <p
                      className={`text-xs font-semibold capitalize ${
                        isToday ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {dayLabel}
                    </p>
                    {isToday && (
                      <Badge
                        variant="outline"
                        className="border-primary/40 text-primary text-xs h-5 px-1.5"
                      >
                        Hoy
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      · {dayApts.length}{" "}
                      {dayApts.length === 1 ? "cita" : "citas"}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {dayApts.map((apt) => {
                      const status =
                        statusConfig[apt.status as AppointmentStatus] ??
                        statusConfig.pending;
                      const TypeIcon =
                        apt.type === "grooming" ? Scissors : Stethoscope;
                      const terminal = isTerminalStatus(
                        apt.status as AppointmentStatus
                      );
                      return (
                        <li key={apt.id}>
                          <Link
                            href={`/${clinicSlug}/appointments/${apt.id}`}
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/50",
                              terminal && "opacity-60"
                            )}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <span className="min-w-18 text-sm font-semibold tabular-nums text-primary">
                                {formatTime(apt.start_time)}
                              </span>
                              {apt.pet?.photo_url ? (
                                <div className="relative size-8 shrink-0 overflow-hidden rounded-full border">
                                  <Image
                                    src={apt.pet.photo_url}
                                    alt={apt.pet.name}
                                    fill
                                    sizes="32px"
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <TypeIcon className="size-4 shrink-0 text-muted-foreground" />
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {apt.pet?.name ?? "Sin mascota"}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {apt.client
                                    ? `${apt.client.first_name} ${apt.client.last_name}`
                                    : "Sin cliente"}
                                </p>
                              </div>
                            </div>
                            <Badge variant={status.variant} className="shrink-0">
                              {status.label}
                            </Badge>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
