import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, subDays, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth/current-member";
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
  searchParams: Promise<{
    date?: string;
    view?: string;
    status?: string;
    mine?: string;
  }>;
}) {
  const { clinic } = await params;
  const {
    date: dateParam,
    view: viewParam,
    status: statusParam,
    mine: mineParam,
  } = await searchParams;

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", clinic)
    .single();

  if (!org) {
    return <p className="text-sm text-muted-foreground">Organizacion no encontrada.</p>;
  }

  const currentMember = await getCurrentMember(clinic);
  // vet y groomer ven solo lo suyo por defecto; admin/recepcionista ven todo.
  // El usuario puede sobreescribir con ?mine=0 (todas) o ?mine=1 (mías).
  const defaultMine =
    currentMember?.role === "vet" || currentMember?.role === "groomer";
  const showMine =
    mineParam === "1"
      ? true
      : mineParam === "0"
        ? false
        : defaultMine;
  const assignedTo =
    showMine && currentMember ? currentMember.id : undefined;
  const canToggle = !!currentMember;

  const today = new Date().toISOString().split("T")[0];
  const selectedDate = dateParam || today;
  const view = viewParam === "week" ? "week" : "day";
  const dateObj = new Date(selectedDate + "T12:00:00");

  const baseQuery = `view=${view}&date=${selectedDate}${
    statusParam ? `&status=${statusParam}` : ""
  }`;
  const mineHref = `/${clinic}/appointments?${baseQuery}&mine=1`;
  const allHref = `/${clinic}/appointments?${baseQuery}&mine=0`;

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

      <div className="flex flex-wrap items-center gap-3">
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

        {canToggle && (
          <div className="flex rounded-lg border p-0.5">
            <Link href={mineHref}>
              <Button
                variant={showMine ? "default" : "ghost"}
                size="xs"
              >
                Mías
              </Button>
            </Link>
            <Link href={allHref}>
              <Button
                variant={!showMine ? "default" : "ghost"}
                size="xs"
              >
                Todas
              </Button>
            </Link>
          </div>
        )}

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
          defaultStatus={statusParam}
          assignedTo={assignedTo}
        />
      ) : (
        <WeekViewSection
          clinic={clinic}
          orgId={org.id}
          selectedDate={selectedDate}
          dateObj={dateObj}
          assignedTo={assignedTo}
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
  defaultStatus,
  assignedTo,
}: {
  clinic: string;
  orgId: string;
  selectedDate: string;
  dateObj: Date;
  today: string;
  defaultStatus?: string;
  assignedTo?: string;
}) {
  const prevDate = format(subDays(dateObj, 1), "yyyy-MM-dd");
  const nextDate = format(addDays(dateObj, 1), "yyyy-MM-dd");
  const isToday = selectedDate === today;
  const dateLabel = format(dateObj, "EEEE d 'de' MMMM, yyyy", { locale: es });

  const { data: appointments } = await getAppointments(orgId, selectedDate, {
    assignedTo,
  });

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
        defaultStatus={defaultStatus}
      />
    </>
  );
}

async function WeekViewSection({
  clinic,
  orgId,
  selectedDate,
  dateObj,
  assignedTo,
}: {
  clinic: string;
  orgId: string;
  selectedDate: string;
  dateObj: Date;
  assignedTo?: string;
}) {
  const weekStart = startOfWeek(dateObj, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");

  const { data: appointments } = await getWeekAppointments(
    orgId,
    weekStartStr,
    { assignedTo }
  );

  return (
    <WeekView
      appointments={appointments ?? []}
      clinicSlug={clinic}
      selectedDate={selectedDate}
    />
  );
}
