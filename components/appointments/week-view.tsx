"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  addWeeks,
  subWeeks,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/appointments/status-badge";
import { cn } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/app/[clinic]/appointments/actions";

function formatTime(time: string): string {
  return time.slice(0, 5);
}

interface WeekViewProps {
  appointments: AppointmentWithRelations[];
  clinicSlug: string;
  selectedDate: string;
}

export function WeekView({ appointments, clinicSlug, selectedDate }: WeekViewProps) {
  const dateObj = new Date(selectedDate + "T12:00:00");
  const today = new Date();

  const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(dateObj, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const prevWeekStart = format(subWeeks(weekStart, 1), "yyyy-MM-dd");
  const nextWeekStart = format(addWeeks(weekStart, 1), "yyyy-MM-dd");
  const todayStr = format(today, "yyyy-MM-dd");

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, AppointmentWithRelations[]>();
    for (const day of days) {
      map.set(format(day, "yyyy-MM-dd"), []);
    }
    for (const apt of appointments) {
      const existing = map.get(apt.date);
      if (existing) {
        existing.push(apt);
      }
    }
    return map;
  }, [appointments, days]);

  const weekLabel = `${format(weekStart, "d MMM", { locale: es })} - ${format(weekEnd, "d MMM yyyy", { locale: es })}`;
  const isCurrentWeek = days.some((d) => isSameDay(d, today));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/${clinicSlug}/appointments?view=week&date=${prevWeekStart}`}>
          <Button variant="outline" size="icon">
            <ChevronLeft className="size-4" />
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize">{weekLabel}</span>
          {!isCurrentWeek && (
            <Link href={`/${clinicSlug}/appointments?view=week&date=${todayStr}`}>
              <Button variant="ghost" size="xs">
                Esta semana
              </Button>
            </Link>
          )}
        </div>

        <Link href={`/${clinicSlug}/appointments?view=week&date=${nextWeekStart}`}>
          <Button variant="outline" size="icon">
            <ChevronRight className="size-4" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-2 overflow-x-auto">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayAppointments = appointmentsByDay.get(dateStr) ?? [];
          const isToday = isSameDay(day, today);

          return (
            <div
              key={dateStr}
              className={cn(
                "min-w-[140px] rounded-lg border p-2",
                isToday && "border-primary bg-primary/5"
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <Link
                  href={`/${clinicSlug}/appointments?view=day&date=${dateStr}`}
                  className="hover:underline"
                >
                  <div className="text-center">
                    <span className="text-xs text-muted-foreground capitalize">
                      {format(day, "EEE", { locale: es })}
                    </span>
                    <span
                      className={cn(
                        "ml-1 text-sm font-semibold",
                        isToday && "text-primary"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>
                </Link>
                <Link href={`/${clinicSlug}/appointments/new?date=${dateStr}`}>
                  <Button variant="ghost" size="icon" className="size-6">
                    <Plus className="size-3" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-1.5">
                {dayAppointments.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground/50">
                    Sin citas
                  </p>
                ) : (
                  dayAppointments.map((apt) => (
                    <Link
                      key={apt.id}
                      href={`/${clinicSlug}/appointments/${apt.id}`}
                    >
                      <Card className="p-2 transition-colors hover:bg-muted/50">
                        <p className="text-xs font-medium">
                          {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                        </p>
                        <p className="truncate text-xs font-medium">
                          {apt.pet.name}
                        </p>
                        <div className="mt-1">
                          <StatusBadge
                            status={apt.status}
                            className="text-[10px] px-1.5 py-0"
                          />
                        </div>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
