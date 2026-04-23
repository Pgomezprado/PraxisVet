"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { requestAppointment } from "../actions";
import type { TutorPet } from "../queries";

type Props = {
  clinicSlug: string;
  pets: TutorPet[];
  variant?: "default" | "outline";
};

export function RequestAppointmentButton({
  clinicSlug,
  pets,
  variant = "default",
}: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [preferredDate, setPreferredDate] = useState("");

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await requestAppointment(clinicSlug, formData);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={variant} size="sm">
            <Plus className="size-4" data-icon="inline-start" />
            Solicitar cita
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar una cita</DialogTitle>
          <DialogDescription>
            Enviaremos tu solicitud a la clínica. Te confirmarán el horario
            definitivo lo antes posible.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="petId">Mascota</Label>
            <select
              id="petId"
              name="petId"
              required
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              defaultValue={pets[0]?.id}
            >
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de atención</Label>
            <select
              id="type"
              name="type"
              required
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              defaultValue="medical"
            >
              <option value="medical">Consulta médica</option>
              <option value="grooming">Peluquería</option>
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="preferredDate">Fecha preferida</Label>
              <DatePicker
                id="preferredDate"
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
              <Label htmlFor="preferredTime">Hora aproximada</Label>
              <Input
                id="preferredTime"
                name="preferredTime"
                type="time"
                required
                defaultValue="10:00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Textarea
              id="reason"
              name="reason"
              rows={3}
              maxLength={500}
              placeholder="Ej: control anual, vacuna, baño, uñas"
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
      </DialogContent>
    </Dialog>
  );
}
