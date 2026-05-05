"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Hourglass,
  Syringe,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTransition } from "react";
import { hashTutorId, trackTutorEvent } from "@/lib/analytics/tutor-events";
import { requestAppointment } from "../actions";

export type VaccineAlert = {
  petId: string;
  petName: string;
  vaccineName: string;
  status: "vencida" | "por_vencer";
  daysFromNow: number; // negativo si ya venció, positivo si está por vencer
};

type Props = {
  clinicSlug: string;
  tutorId: string;
  alerts: VaccineAlert[];
};

function alertCopy(a: VaccineAlert): string {
  const abs = Math.abs(a.daysFromNow);
  if (a.status === "vencida") {
    return `${a.petName} necesita su vacuna ${a.vaccineName} — venció hace ${abs} ${
      abs === 1 ? "día" : "días"
    }.`;
  }
  if (abs === 0) {
    return `${a.petName} necesita su vacuna ${a.vaccineName} hoy.`;
  }
  return `${a.petName} necesita su vacuna ${a.vaccineName} en ${abs} ${
    abs === 1 ? "día" : "días"
  }.`;
}

export function VaccineReminderBanner({
  clinicSlug,
  tutorId,
  alerts,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<VaccineAlert | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preferredDate, setPreferredDate] = useState("");
  const [isPending, startTransition] = useTransition();

  if (alerts.length === 0) return null;

  const visible = alerts.slice(0, 2);
  const more = alerts.length - visible.length;

  function handleClick(a: VaccineAlert) {
    setActive(a);
    setError(null);
    setPreferredDate("");
    setOpen(true);
    trackTutorEvent("tutor_vaccine_reminder_clicked", {
      clinic_slug: clinicSlug,
      tutor_id: hashTutorId(tutorId),
      pet_id: a.petId,
      vaccine_status: a.status,
    });
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await requestAppointment(clinicSlug, formData);
      if (!res.success) {
        setError(res.error);
        return;
      }
      trackTutorEvent("tutor_appointment_requested", {
        clinic_slug: clinicSlug,
        tutor_id: hashTutorId(tutorId),
        pet_id: active?.petId ?? null,
        source: "vaccine_banner",
      });
      setOpen(false);
    });
  }

  return (
    <>
      <div className="space-y-3">
        {visible.map((a) => {
          const isOverdue = a.status === "vencida";
          const tone = isOverdue
            ? "border-2 border-[oklch(0.78_0.12_45)]/70 bg-[oklch(0.94_0.08_55)] shadow-sm"
            : "border-2 border-amber-300/80 bg-amber-100/80 shadow-sm";
          const Icon = isOverdue ? AlertTriangle : Hourglass;
          const iconTone = isOverdue
            ? "text-[oklch(0.55_0.15_45)]"
            : "text-amber-700";
          return (
            <div
              key={`${a.petId}-${a.vaccineName}`}
              className={`flex items-start gap-3 rounded-2xl border p-4 sm:p-5 ${tone}`}
              role="status"
            >
              <div
                className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/70 ${iconTone}`}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground sm:text-[15px]">
                  <Syringe
                    className="-mt-0.5 mr-1 inline size-3.5 align-middle opacity-70"
                  />
                  {alertCopy(a)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Reservar la hora toma menos de un minuto.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleClick(a)}
                className="shrink-0"
              >
                Reservar
                <ChevronRight
                  className="size-3.5"
                  data-icon="inline-end"
                />
              </Button>
            </div>
          );
        })}

        {more > 0 && (
          <p className="px-1 text-xs text-muted-foreground">
            +{more} {more === 1 ? "recordatorio" : "recordatorios"} más.
            Mira el detalle entrando a la ficha de cada engreído.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {active
                ? `Reservar para ${active.petName}`
                : "Reservar una hora"}
            </DialogTitle>
            <DialogDescription>
              Enviamos tu solicitud a la clínica. Te confirmarán el horario
              definitivo lo antes posible.
            </DialogDescription>
          </DialogHeader>
          {active && (
            <form action={handleSubmit} className="space-y-4">
              <input type="hidden" name="petId" value={active.petId} />
              <input type="hidden" name="type" value="medical" />

              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="font-medium">{active.petName}</p>
                <p className="text-xs text-muted-foreground">
                  Motivo: Vacuna {active.vaccineName}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vrb-date">Fecha preferida</Label>
                  <DatePicker
                    id="vrb-date"
                    value={preferredDate}
                    onChange={setPreferredDate}
                  />
                  <input
                    type="hidden"
                    name="preferredDate"
                    value={preferredDate}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vrb-time">Hora aproximada</Label>
                  <Input
                    id="vrb-time"
                    name="preferredTime"
                    type="time"
                    required
                    defaultValue="10:00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vrb-reason">Motivo</Label>
                <Textarea
                  id="vrb-reason"
                  name="reason"
                  rows={2}
                  maxLength={500}
                  defaultValue={`Vacuna ${active.vaccineName}`}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <DialogFooter>
                <DialogClose
                  render={
                    <Button type="button" variant="ghost" disabled={isPending}>
                      Cancelar
                    </Button>
                  }
                />
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Enviando..." : "Enviar solicitud"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
