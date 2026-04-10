"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, User, PawPrint, Stethoscope, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/appointments/status-badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { updateAppointmentStatus } from "@/app/[clinic]/appointments/actions";
import type { AppointmentWithRelations } from "@/app/[clinic]/appointments/actions";
import type { AppointmentStatus } from "@/types";

function formatTime(time: string): string {
  return time.slice(0, 5);
}

const statusTransitions: Record<
  AppointmentStatus,
  { label: string; to: AppointmentStatus }[]
> = {
  pending: [
    { label: "Confirmar", to: "confirmed" },
    { label: "Cancelar", to: "cancelled" },
  ],
  confirmed: [
    { label: "Iniciar consulta", to: "in_progress" },
    { label: "Cancelar", to: "cancelled" },
  ],
  in_progress: [
    { label: "Completar", to: "completed" },
    { label: "Cancelar", to: "cancelled" },
  ],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function AppointmentCard({
  appointment,
  clinicSlug,
}: {
  appointment: AppointmentWithRelations;
  clinicSlug: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const vetName = [appointment.vet.first_name, appointment.vet.last_name]
    .filter(Boolean)
    .join(" ") || "Sin asignar";

  const clientName = `${appointment.client.first_name} ${appointment.client.last_name}`;

  const transitions = statusTransitions[appointment.status] ?? [];

  async function handleStatusChange(newStatus: AppointmentStatus) {
    setLoading(true);
    const result = await updateAppointmentStatus(appointment.id, newStatus);
    setLoading(false);
    if (!result.error) {
      router.refresh();
    }
  }

  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent className="flex items-start gap-4">
        <Link
          href={`/${clinicSlug}/appointments/${appointment.id}`}
          className="flex flex-col items-center justify-center rounded-lg bg-muted px-3 py-2 text-center"
        >
          <span className="text-lg font-bold leading-none">
            {formatTime(appointment.start_time)}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(appointment.end_time)}
          </span>
        </Link>

        <Link
          href={`/${clinicSlug}/appointments/${appointment.id}`}
          className="flex-1 space-y-1.5"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium leading-none">
              {appointment.pet.name}
              {appointment.pet.species && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({appointment.pet.species})
                </span>
              )}
            </h3>
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
        </Link>

        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {transitions.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="cursor-pointer"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <StatusBadge status={appointment.status} />
                    )}
                  </button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Cambiar estado</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {transitions.map((t) => (
                  <DropdownMenuItem
                    key={t.to}
                    onClick={() => handleStatusChange(t.to)}
                  >
                    {t.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <StatusBadge status={appointment.status} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
