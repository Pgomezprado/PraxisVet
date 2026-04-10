import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { AppointmentList } from "@/components/appointments/appointment-list";
import { getAppointments } from "./actions";

export default async function AppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { clinic } = await params;
  const { date: dateParam } = await searchParams;

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
  const dateObj = new Date(selectedDate + "T12:00:00");
  const prevDate = format(subDays(dateObj, 1), "yyyy-MM-dd");
  const nextDate = format(addDays(dateObj, 1), "yyyy-MM-dd");
  const isToday = selectedDate === today;

  const dateLabel = format(dateObj, "EEEE d 'de' MMMM, yyyy", { locale: es });

  const { data: appointments } = await getAppointments(org.id, selectedDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona las citas de tu clinica.
          </p>
        </div>
        <Link href={`/${clinic}/appointments/new`}>
          <Button>
            <Plus className="size-4" />
            Nueva cita
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Link href={`/${clinic}/appointments?date=${prevDate}`}>
          <Button variant="outline" size="icon">
            <ChevronLeft className="size-4" />
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize">{dateLabel}</span>
          {!isToday && (
            <Link href={`/${clinic}/appointments`}>
              <Button variant="ghost" size="xs">
                Hoy
              </Button>
            </Link>
          )}
        </div>

        <Link href={`/${clinic}/appointments?date=${nextDate}`}>
          <Button variant="outline" size="icon">
            <ChevronRight className="size-4" />
          </Button>
        </Link>
      </div>

      <AppointmentList
        appointments={appointments ?? []}
        clinicSlug={clinic}
      />
    </div>
  );
}
