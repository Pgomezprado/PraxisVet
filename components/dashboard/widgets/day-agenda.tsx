import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays, Clock, Stethoscope, Scissors, FilePlus2 } from "lucide-react";
import { formatTime } from "@/lib/utils/format";
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

export function DayAgenda({
  title = "Agenda de hoy",
  description,
  appointments,
  emptyTitle,
  emptyDescription,
  emptyAction,
  clinicSlug,
  maxHeight = false,
}: {
  title?: string;
  description?: string;
  appointments: TodayAppointment[];
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: { label: string; href: string };
  clinicSlug: string;
  maxHeight?: boolean;
}) {
  const empty = appointments.length === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </div>
          {!empty && (
            <Link href={`/${clinicSlug}/appointments`}>
              <Button variant="ghost" size="sm" className="gap-1">
                Ver todas
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          )}
        </div>
        <CardDescription>
          {empty
            ? "Empieza tu día con la agenda al día"
            : description ??
              `${appointments.length} cita${appointments.length > 1 ? "s" : ""}`}
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
          <ul
            className={`space-y-2 ${maxHeight ? "max-h-[420px] overflow-y-auto pr-1" : ""}`}
          >
            {appointments.map((apt) => {
              const status =
                statusConfig[apt.status as AppointmentStatus] ??
                statusConfig.pending;
              const TypeIcon = apt.type === "grooming" ? Scissors : Stethoscope;
              const canOpenRecord =
                apt.type === "medical" && apt.client?.id && apt.pet?.id;
              return (
                <li key={apt.id}>
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/50">
                    <Link
                      href={`/${clinicSlug}/appointments/${apt.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
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
                          {apt.assignee
                            ? ` · ${apt.assignee.first_name ?? ""} ${apt.assignee.last_name ?? ""}`.trim()
                            : ""}
                        </p>
                      </div>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {canOpenRecord && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Abrir consulta"
                          render={
                            <Link
                              href={`/${clinicSlug}/clients/${apt.client!.id}/pets/${apt.pet!.id}/records/new?appointment=${apt.id}`}
                            />
                          }
                        >
                          <FilePlus2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
