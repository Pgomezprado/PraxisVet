"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Syringe, Bug } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addManualVaccination, addManualDeworming } from "../actions";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddManualVaccinationDialog({ petId }: { petId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [vaccineName, setVaccineName] = useState("");
  const [date, setDate] = useState(todayISO());
  const [nextDue, setNextDue] = useState("");
  const [notes, setNotes] = useState("");

  function reset() {
    setVaccineName("");
    setDate(todayISO());
    setNextDue("");
    setNotes("");
    setError(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!vaccineName.trim()) {
      setError("Indica qué vacuna");
      return;
    }
    if (!date) {
      setError("Indica la fecha de aplicación");
      return;
    }

    startTransition(async () => {
      const result = await addManualVaccination({
        pet_id: petId,
        vaccine_name: vaccineName.trim(),
        date_administered: date,
        next_due_date: nextDue || undefined,
        notes: notes.trim() || undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="h-3.5 w-3.5" />
            Agregar vacuna
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Syringe className="h-4 w-4 text-primary" />
            Registrar vacuna
          </DialogTitle>
          <DialogDescription>
            Guarda lo que ya le aplicaron a tu mascota. Si tu vet está en
            PraxisVet, ella las registra automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="vacc-name">Vacuna</Label>
            <Input
              id="vacc-name"
              placeholder="Ej: Séxtuple canina"
              value={vaccineName}
              onChange={(e) => setVaccineName(e.target.value)}
              autoFocus
              disabled={pending}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vacc-date">Fecha aplicada</Label>
              <Input
                id="vacc-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={pending}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vacc-next">Próxima dosis (opcional)</Label>
              <Input
                id="vacc-next"
                type="date"
                value={nextDue}
                onChange={(e) => setNextDue(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vacc-notes">Notas (opcional)</Label>
            <Textarea
              id="vacc-notes"
              placeholder="Ej: dosis aplicada en clínica veterinaria de mi barrio"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={pending}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                "Guardar vacuna"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const DEWORM_TYPES = [
  { value: "interna", label: "Interna (parásitos intestinales)" },
  { value: "externa", label: "Externa (pulgas, garrapatas)" },
] as const;

export function AddManualDewormingDialog({ petId }: { petId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<string>("");
  const [product, setProduct] = useState("");
  const [date, setDate] = useState(todayISO());
  const [nextDue, setNextDue] = useState("");

  function reset() {
    setType("");
    setProduct("");
    setDate(todayISO());
    setNextDue("");
    setError(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!type) {
      setError("Selecciona el tipo");
      return;
    }
    if (!date) {
      setError("Indica la fecha de aplicación");
      return;
    }

    startTransition(async () => {
      const result = await addManualDeworming({
        pet_id: petId,
        type: type as "interna" | "externa",
        product: product.trim() || undefined,
        date_administered: date,
        next_due_date: nextDue || undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="h-3.5 w-3.5" />
            Agregar desparasitación
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-primary" />
            Registrar desparasitación
          </DialogTitle>
          <DialogDescription>
            Guarda los antiparasitarios que le diste a tu mascota.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="dew-type">Tipo</Label>
            <Select
              id="dew-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={pending}
              required
            >
              <option value="" disabled>
                Elige una opción
              </option>
              {DEWORM_TYPES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dew-product">Producto (opcional)</Label>
            <Input
              id="dew-product"
              placeholder="Ej: Bravecto, Drontal"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dew-date">Fecha aplicada</Label>
              <Input
                id="dew-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={pending}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dew-next">Próxima dosis (opcional)</Label>
              <Input
                id="dew-next"
                type="date"
                value={nextDue}
                onChange={(e) => setNextDue(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
