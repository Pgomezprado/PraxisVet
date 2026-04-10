import Link from "next/link";
import { Clock, User, PawPrint, Stethoscope } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/appointments/status-badge";
import type { AppointmentWithRelations } from "@/app/[clinic]/appointments/actions";

function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function AppointmentCard({
  appointment,
  clinicSlug,
}: {
  appointment: AppointmentWithRelations;
  clinicSlug: string;
}) {
  const vetName = [appointment.vet.first_name, appointment.vet.last_name]
    .filter(Boolean)
    .join(" ") || "Sin asignar";

  const clientName = `${appointment.client.first_name} ${appointment.client.last_name}`;

  return (
    <Link href={`/${clinicSlug}/appointments/${appointment.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex items-start gap-4">
          <div className="flex flex-col items-center justify-center rounded-lg bg-muted px-3 py-2 text-center">
            <span className="text-lg font-bold leading-none">
              {formatTime(appointment.start_time)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(appointment.end_time)}
            </span>
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium leading-none">
                {appointment.pet.name}
                {appointment.pet.species && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({appointment.pet.species})
                  </span>
                )}
              </h3>
              <StatusBadge status={appointment.status} />
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="size-3" />
                {clientName}
              </span>
              <span className="flex items-center gap-1">
                <Stethoscope className="size-3" />
                {vetName}
              </span>
              {appointment.service && (
                <span className="flex items-center gap-1">
                  <PawPrint className="size-3" />
                  {appointment.service.name}
                </span>
              )}
            </div>

            {appointment.reason && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {appointment.reason}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
