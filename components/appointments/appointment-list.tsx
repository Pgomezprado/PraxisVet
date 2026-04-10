"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { AppointmentCard } from "@/components/appointments/appointment-card";
import { Select } from "@/components/ui/select";
import type { AppointmentWithRelations } from "@/app/[clinic]/appointments/actions";
import type { AppointmentStatus } from "@/types";

const statusOptions: { value: string; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmada" },
  { value: "in_progress", label: "En curso" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
  { value: "no_show", label: "No asistio" },
];

export function AppointmentList({
  appointments,
  clinicSlug,
}: {
  appointments: AppointmentWithRelations[];
  clinicSlug: string;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered =
    statusFilter === "all"
      ? appointments
      : appointments.filter((a) => a.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-48"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "cita" : "citas"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <CalendarDays className="mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            No hay citas para mostrar
          </p>
          <p className="text-xs text-muted-foreground/70">
            {statusFilter !== "all"
              ? "Prueba cambiando el filtro de estado"
              : "Agenda una nueva cita para comenzar"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              clinicSlug={clinicSlug}
            />
          ))}
        </div>
      )}
    </div>
  );
}
