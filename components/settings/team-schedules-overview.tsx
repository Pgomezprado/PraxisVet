import Link from "next/link";
import { CalendarClock, ArrowRight, Scissors, Stethoscope } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { roleLabels } from "@/lib/validations/team-members";
import type { TeamScheduleOverviewMember } from "@/app/[clinic]/settings/clinic/actions";
import type { MemberRole } from "@/types";

interface TeamSchedulesOverviewProps {
  members: TeamScheduleOverviewMember[];
  clinicSlug: string;
}

const DAY_LABELS_SHORT = ["D", "L", "M", "M", "J", "V", "S"];
const DAY_LABELS_LONG = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
// Orden visual: lunes a domingo (laboral primero)
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const roleIcons: Record<MemberRole, typeof Stethoscope> = {
  admin: Stethoscope,
  vet: Stethoscope,
  receptionist: Stethoscope,
  groomer: Scissors,
};

function getInitials(first: string | null, last: string | null): string {
  const f = first?.trim();
  const l = last?.trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  if (f) return f.slice(0, 2).toUpperCase();
  return "?";
}

function formatTime(value: string): string {
  // value viene como "HH:mm:ss" desde Postgres; cortamos a HH:mm
  return value.slice(0, 5);
}

function slotsForDay(
  schedules: TeamScheduleOverviewMember["schedules"],
  day: number
): string {
  const daySlots = schedules.filter((s) => s.day_of_week === day);
  if (daySlots.length === 0) return "—";
  return daySlots
    .map((s) => `${formatTime(s.start_time)}-${formatTime(s.end_time)}`)
    .join(" · ");
}

export function TeamSchedulesOverview({
  members,
  clinicSlug,
}: TeamSchedulesOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <CalendarClock className="size-4 text-primary" />
          Horarios de atención del equipo
        </CardTitle>
        <CardDescription>
          Vista general de los horarios semanales de cada profesional. Para
          editar, ve a Equipo → editar miembro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <CalendarClock className="size-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Aún no hay horarios configurados
              </p>
              <p className="text-xs text-muted-foreground">
                Define los días y tramos de cada profesional para que la agenda
                funcione correctamente.
              </p>
            </div>
            <Link
              href={`/${clinicSlug}/settings/team`}
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Configura horarios en Equipo
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {members.map((member) => {
              const Icon = roleIcons[member.role];
              const name =
                [member.first_name, member.last_name]
                  .filter(Boolean)
                  .join(" ") || "Sin nombre";

              return (
                <li key={member.id}>
                  <Link
                    href={`/${clinicSlug}/settings/team/${member.id}/edit`}
                    className="group flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:border-primary/40 hover:bg-muted/40 lg:flex-row lg:items-center"
                  >
                    <div className="flex items-center gap-3 lg:w-64 lg:shrink-0">
                      <Avatar className="size-10 border border-border">
                        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                          {getInitials(member.first_name, member.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{name}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="gap-1 px-1.5 py-0 text-[10px] font-normal"
                          >
                            <Icon className="size-3" />
                            {roleLabels[member.role]}
                          </Badge>
                          {member.specialty && (
                            <span className="truncate text-[11px] text-muted-foreground">
                              {member.specialty}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mobile: lista vertical */}
                    <div className="space-y-1 lg:hidden">
                      {DISPLAY_ORDER.map((day) => {
                        const slots = slotsForDay(member.schedules, day);
                        const empty = slots === "—";
                        return (
                          <div
                            key={day}
                            className="flex items-baseline gap-2 text-xs"
                          >
                            <span className="w-20 shrink-0 font-medium">
                              {DAY_LABELS_LONG[day]}:
                            </span>
                            <span
                              className={
                                empty
                                  ? "text-muted-foreground"
                                  : "tabular-nums"
                              }
                            >
                              {slots}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop: grid 7 columnas */}
                    <div className="hidden flex-1 grid-cols-7 gap-2 lg:grid">
                      {DISPLAY_ORDER.map((day) => {
                        const slots = slotsForDay(member.schedules, day);
                        const empty = slots === "—";
                        return (
                          <div
                            key={day}
                            className="rounded-md border border-border/60 bg-muted/30 px-2 py-2 text-center"
                          >
                            <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                              {DAY_LABELS_SHORT[day]}
                            </p>
                            <p
                              className={`mt-1 whitespace-pre-line text-[11px] leading-tight tabular-nums ${
                                empty ? "text-muted-foreground" : ""
                              }`}
                            >
                              {empty
                                ? "—"
                                : slots
                                    .split(" · ")
                                    .join("\n")}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
