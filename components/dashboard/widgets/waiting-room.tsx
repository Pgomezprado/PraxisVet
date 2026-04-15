import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bell, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/utils/format";
import type { TodayAppointment } from "@/app/[clinic]/dashboard/queries";

export function WaitingRoomWidget({
  appointments,
  clinicSlug,
}: {
  appointments: TodayAppointment[];
  clinicSlug: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="size-5 text-orange-600 dark:text-orange-400" />
          <CardTitle className="text-base font-semibold">
            En sala / en curso
          </CardTitle>
        </div>
        <CardDescription>
          {appointments.length === 0
            ? "Nadie esperando ni en consulta"
            : `${appointments.length} paciente${
                appointments.length > 1 ? "s" : ""
              } atendi${appointments.length > 1 ? "éndose" : "éndose"} ahora`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/30 bg-primary/5 py-8 text-center">
            <CheckCircle2 className="mb-2 size-8 text-primary" />
            <p className="text-sm font-medium">Sala vacía</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {appointments.map((apt) => (
              <li key={apt.id}>
                <Link
                  href={`/${clinicSlug}/appointments/${apt.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {apt.pet?.name ?? "Sin mascota"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {apt.client
                        ? `${apt.client.first_name} ${apt.client.last_name}`
                        : ""}
                      {" · "}
                      {formatTime(apt.start_time)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      apt.status === "ready_for_pickup" ? "default" : "secondary"
                    }
                  >
                    {apt.status === "ready_for_pickup"
                      ? "Listo"
                      : "En curso"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
