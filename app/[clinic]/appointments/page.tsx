import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, subDays, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { AppointmentList } from "@/components/appointments/appointment-list";
import { WeekView } from "@/components/appointments/week-view";
import { DaySelector } from "@/components/appointments/day-selector";
import { getAppointments, getWeekAppointments } from "./actions";

export default async function AppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string }>;
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const { clinic } = await params;
  const { date: dateParam, view: viewParam } = await searchParams;

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", clinic)
    .single();

  if (!org) {
    return <p className="text-sm text-muted-foreground">Organizacion no encontrada.</p>;
  }

  const today = new Date().toISOString().split("T")[0];
  const selectedDate = dateParam || today;
  const view = viewParam === "week" ? "week" : "day";
  const dateObj = new Date(selectedDate + "T12:00:00");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona las citas de tu clínica.
          </p>
        </div>
        <Link href={`/${clinic}/appointments/new`}>
          <Button>
            <Plus className="size-4" />
            Nueva cita
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border p-0.5">
          <Link href={`/${clinic}/appointments?view=day&date=${selectedDate}`}>
            <Button
              variant={view === "day" ? "default" : "ghost"}
              size="xs"
            >
              Dia
            </Button>
          </Link>
          <Link href={`/${clinic}/appointments?view=week&date=${selectedDate}`}>
            <Button
              variant={view === "week" ? "default" : "ghost"}
              size="xs"
            >
              Semana
            </Button>
          </Link>
        </div>

        <DaySelector
          clinicSlug={clinic}
          selectedDate={selectedDate}
          view={view}
        />
      </div>

      {view === "day" ? (
        <DayView
          clinic={clinic}
          orgId={org.id}
          selectedDate={selectedDate}
          dateObj={dateObj}
          today={today}
        />
      ) : (
        <WeekViewSection
          clinic={clinic}
          orgId={org.id}
          selectedDate={selectedDate}
          dateObj={dateObj}
        />
      )}
    </div>
  );
}

async function DayView({
  clinic,
  orgId,
  selectedDate,
  dateObj,
  today,
}: {
  clinic: string;
  orgId: string;
  selectedDate: string;
  dateObj: Date;
  today: string;
}) {
  const prevDate = format(subDays(dateObj, 1), "yyyy-MM-dd");
  const nextDate = format(addDays(dateObj, 1), "yyyy-MM-dd");
  const isToday = selectedDate === today;
  const dateLabel = format(dateObj, "EEEE d 'de' MMMM, yyyy", { locale: es });

  const { data: appointments } = await getAppointments(orgId, selectedDate);

  return (
    <>
      <div className="flex items-center gap-2">
        <Link href={`/${clinic}/appointments?view=day&date=${prevDate}`}>
          <Button variant="outline" size="icon">
            <ChevronLeft className="size-4" />
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize">{dateLabel}</span>
          {!isToday && (
            <Link href={`/${clinic}/appointments?view=day`}>
              <Button variant="ghost" size="xs">
                Hoy
              </Button>
            </Link>
          )}
        </div>

        <Link href={`/${clinic}/appointments?view=day&date=${nextDate}`}>
          <Button variant="outline" size="icon">
            <ChevronRight className="size-4" />
          </Button>
        </Link>
      </div>

      <AppointmentList
        appointments={appointments ?? []}
        clinicSlug={clinic}
      />
    </>
  );
}

async function WeekViewSection({
  clinic,
  orgId,
  selectedDate,
  dateObj,
}: {
  clinic: string;
  orgId: string;
  selectedDate: string;
  dateObj: Date;
}) {
  const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");

  const { data: appointments } = await getWeekAppointments(orgId, weekStartStr);

  return (
    <WeekView
      appointments={appointments ?? []}
      clinicSlug={clinic}
      selectedDate={selectedDate}
    />
  );
}
