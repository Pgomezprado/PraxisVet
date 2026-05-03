"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateAppointmentStatus, deleteAppointment } from "@/app/[clinic]/appointments/actions";
import type { AppointmentStatus, AppointmentType } from "@/types";
import {
  CheckCircle,
  XCircle,
  Play,
  Clock,
  Ban,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

type Transition = {
  label: string;
  to: AppointmentStatus;
  icon: typeof CheckCircle;
  variant: "default" | "outline" | "destructive";
};

// Las transiciones son las mismas para medical y grooming, pero el copy
// cambia: "Iniciar consulta" no aplica a peluquería, donde se inicia un
// "servicio". Mantenemos ambas variantes para no confundir al peluquero.
function buildTransitions(
  type: AppointmentType
): Record<AppointmentStatus, Transition[]> {
  const startLabel =
    type === "grooming" ? "Iniciar peluquería" : "Iniciar consulta";

  return {
    pending: [
      { label: "Confirmar", to: "confirmed", icon: CheckCircle, variant: "default" },
      { label: "Cancelar", to: "cancelled", icon: XCircle, variant: "destructive" },
    ],
    confirmed: [
      { label: startLabel, to: "in_progress", icon: Play, variant: "default" },
      { label: "Cancelar", to: "cancelled", icon: XCircle, variant: "destructive" },
      { label: "No asistió", to: "no_show", icon: Ban, variant: "outline" },
    ],
    in_progress: [
      { label: "Listo para retiro", to: "ready_for_pickup", icon: Clock, variant: "outline" },
      { label: "Completar", to: "completed", icon: CheckCircle, variant: "default" },
    ],
    ready_for_pickup: [
      { label: "Completar", to: "completed", icon: CheckCircle, variant: "default" },
    ],
    completed: [],
    cancelled: [
      { label: "Reabrir", to: "pending", icon: Clock, variant: "outline" },
    ],
    no_show: [
      { label: "Reabrir", to: "pending", icon: Clock, variant: "outline" },
    ],
  };
}

export function StatusActions({
  appointmentId,
  currentStatus,
  appointmentType,
  clinicSlug,
  startRedirect,
}: {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  appointmentType: AppointmentType;
  clinicSlug: string;
  startRedirect?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const available = buildTransitions(appointmentType)[currentStatus] ?? [];

  async function handleStatusChange(newStatus: AppointmentStatus) {
    setLoading(newStatus);
    const result = await updateAppointmentStatus(appointmentId, newStatus);

    if (result.error) {
      setLoading(null);
      alert(result.error);
      return;
    }

    if (newStatus === "in_progress" && startRedirect) {
      router.push(startRedirect);
      return;
    }

    setLoading(null);
    router.refresh();
  }

  async function handleDelete() {
    setLoading("delete");
    setDeleteError(null);
    const result = await deleteAppointment(appointmentId);
    setLoading(null);

    if (result.error) {
      setDeleteError(result.error);
      return;
    }

    setDeleteDialogOpen(false);
    router.push(`/${clinicSlug}/appointments`);
  }

  const isCompleted = currentStatus === "completed";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {available.map((action) => {
        const Icon = action.icon;
        const isLoading = loading === action.to;

        return (
          <Button
            key={action.to}
            variant={action.variant}
            size="sm"
            disabled={loading !== null}
            onClick={() => handleStatusChange(action.to)}
          >
            {isLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Icon className="size-3.5" />
            )}
            {action.label}
          </Button>
        );
      })}

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteError(null);
        }}
      >
        <DialogTrigger
          render={
            <Button
              variant="destructive"
              size="sm"
              disabled={loading !== null}
            >
              <Trash2 className="size-3.5" />
              Eliminar
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isCompleted ? "Eliminar cita completada" : "Eliminar cita"}
            </DialogTitle>
            <DialogDescription>
              {isCompleted
                ? "Esta cita ya está completada. Si la eliminas, también desaparecerá del historial del paciente y de los reportes. La ficha clínica asociada (si existe) NO se borra."
                : "Esta acción no se puede deshacer. La cita será eliminada permanentemente."}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" size="sm">
                  Cancelar
                </Button>
              }
            />
            <Button
              variant="destructive"
              size="sm"
              disabled={loading === "delete"}
              onClick={handleDelete}
            >
              {loading === "delete" && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
