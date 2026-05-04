import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types";

const statusConfig: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pendiente",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  confirmed: {
    label: "Confirmada",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  in_progress: {
    label: "En curso",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  ready_for_pickup: {
    label: "Listo para retiro",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  completed: {
    label: "Completada",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  no_show: {
    label: "No asistió",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

export function getStatusLabel(status: AppointmentStatus): string {
  return statusConfig[status]?.label ?? status;
}

// Estados terminales: la cita ya cerró su ciclo y no bloquea el horario.
// Se atenúan visualmente en las vistas de agenda para que no compitan
// con las citas activas (ver migración 20260504000001).
const TERMINAL_STATUSES = new Set<AppointmentStatus>([
  "completed",
  "cancelled",
  "no_show",
]);

export function isTerminalStatus(status: AppointmentStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}
