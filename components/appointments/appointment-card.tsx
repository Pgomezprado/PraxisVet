"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, User, PawPrint, Stethoscope, Loader2, Wallet } from "lucide-react";
import { formatCLP } from "@/lib/utils/format";
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
import { formatSpecies } from "@/lib/validations/clients";

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
    { label: "Listo para retiro", to: "ready_for_pickup" },
    { label: "Completar", to: "completed" },
    { label: "Cancelar", to: "cancelled" },
  ],
  ready_for_pickup: [
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

  const professionalName =
    [appointment.professional.first_name, appointment.professional.last_name]
      .filter(Boolean)
      .join(" ") || "Sin asignar";

  const clientName = `${appointment.client.first_name} ${appointment.client.last_name}`;

  const transitions = statusTransitions[appointment.status] ?? [];

  async function handleStatusChange(newStatus: AppointmentStatus) {
    setLoading(true);
    const result = await updateAppointmentStatus(appointment.id, newStatus);

    if (result.error) {
      setLoading(false);
      return;
    }

    if (newStatus === "in_progress") {
      const base = `/${clinicSlug}/clients/${appointment.client.id}/pets/${appointment.pet.id}`;
      // Si la cita ya tenía una ficha asociada (escenario raro pero posible si
      // se reabrió o si el vet ya empezó la consulta), evitamos crear un
      // duplicado y vamos directo al detalle existente.
      let target: string;
      if (
        appointment.type === "grooming" &&
        appointment.linked_grooming_record_id
      ) {
        target = `${base}/grooming/${appointment.linked_grooming_record_id}`;
      } else if (
        appointment.type !== "grooming" &&
        appointment.linked_clinical_record_id
      ) {
        target = `${base}/records/${appointment.linked_clinical_record_id}`;
      } else {
        target =
          appointment.type === "grooming"
            ? `${base}/grooming/new?appointment=${appointment.id}`
            : `${base}/records/new?appointment=${appointment.id}`;
      }
      router.push(target);
      return;
    }

    setLoading(false);
    router.refresh();
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
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium leading-none">
              {appointment.pet.name}
              {appointment.pet.species && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({formatSpecies(appointment.pet.species)})
                </span>
              )}
            </h3>
            {appointment.is_dangerous && (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-200">
                <AlertTriangle className="size-3" />
                Peligroso
              </span>
            )}
            {appointment.deposit_amount != null && appointment.deposit_amount > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                title="Abono cobrado para confirmar la hora"
              >
                <Wallet className="size-3" />
                Abono {formatCLP(appointment.deposit_amount)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="size-3" />
              {clientName}
            </span>
            <span className="flex items-center gap-1">
              <Stethoscope className="size-3" />
              {professionalName}
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
