import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Stethoscope, Scissors, Clock } from "lucide-react";
import {
  formatTime,
  minutesUntil,
  formatCountdown,
} from "@/lib/utils/format";
import type { TodayAppointment } from "@/app/[clinic]/dashboard/queries";

export function NextAppointmentCard({
  appointment,
  clinicSlug,
  emptyTitle = "Sin próximas citas",
  emptyDescription = "No tienes más citas programadas hoy.",
}: {
  appointment: TodayAppointment | null;
  clinicSlug: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!appointment) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
            <Clock className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">{emptyTitle}</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            {emptyDescription}
          </p>
        </CardContent>
      </Card>
    );
  }

  const isGrooming = appointment.type === "grooming";
  const Icon = isGrooming ? Scissors : Stethoscope;
  const countdown = formatCountdown(minutesUntil(appointment.start_time));
  const actionLabel = isGrooming ? "Iniciar servicio" : "Iniciar consulta";

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon className="size-5 text-primary" />
            <CardTitle className="text-base font-semibold">
              Próximo: {appointment.pet?.name ?? "Sin mascota"}
            </CardTitle>
          </div>
          <div className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            {formatTime(appointment.start_time)} · {countdown}
          </div>
        </div>
        <CardDescription>
          {appointment.client
            ? `${appointment.client.first_name} ${appointment.client.last_name}`
            : "Sin cliente asignado"}
          {appointment.service && ` · ${appointment.service.name}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {appointment.reason && (
          <p className="mb-4 rounded-lg bg-background/60 p-3 text-sm text-muted-foreground">
            {appointment.reason}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${clinicSlug}/appointments/${appointment.id}`}
          >
            <Button size="sm" className="gap-2">
              {actionLabel}
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
          {appointment.pet && appointment.client && (
            <Link
              href={`/${clinicSlug}/clients/${appointment.client.id}/pets/${appointment.pet.id}`}
            >
              <Button size="sm" variant="outline">
                Ver ficha
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
