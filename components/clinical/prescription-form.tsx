"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  prescriptionSchema,
  type PrescriptionInput,
  MEDICATION_SUGGESTIONS,
  FREQUENCY_OPTIONS,
  DURATION_OPTIONS,
} from "@/lib/validations/prescriptions";
import type { Prescription } from "@/types";

interface PrescriptionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicalRecordId: string;
  prescription?: Prescription | null;
  onSubmit: (data: PrescriptionInput) => Promise<void>;
}

export function PrescriptionForm({
  open,
  onOpenChange,
  clinicalRecordId,
  prescription,
  onSubmit,
}: PrescriptionFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredMeds, setFilteredMeds] = useState<string[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const isEditing = !!prescription;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PrescriptionInput>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      clinical_record_id: clinicalRecordId,
      medication: prescription?.medication ?? "",
      dose: prescription?.dose ?? "",
      frequency: prescription?.frequency ?? "",
      duration: prescription?.duration ?? "",
      notes: prescription?.notes ?? "",
    },
  });

  const medicationValue = watch("medication");

  useEffect(() => {
    if (medicationValue && medicationValue.length > 0) {
      const filtered = MEDICATION_SUGGESTIONS.filter((med) =>
        med.toLowerCase().includes(medicationValue.toLowerCase())
      );
      setFilteredMeds(filtered);
    } else {
      setFilteredMeds([...MEDICATION_SUGGESTIONS]);
    }
  }, [medicationValue]);

  useEffect(() => {
    reset({
      clinical_record_id: clinicalRecordId,
      medication: prescription?.medication ?? "",
      dose: prescription?.dose ?? "",
      frequency: prescription?.frequency ?? "",
      duration: prescription?.duration ?? "",
      notes: prescription?.notes ?? "",
    });
  }, [prescription, clinicalRecordId, reset]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function onFormSubmit(data: PrescriptionInput) {
    setSubmitting(true);
    try {
      await onSubmit(data);
      reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar medicamento" : "Agregar medicamento"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la prescripcion."
              : "Completa los datos del medicamento a recetar."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="grid gap-4">
          <input type="hidden" {...register("clinical_record_id")} />

          <div className="grid gap-2">
            <Label htmlFor="medication">Medicamento *</Label>
            <div className="relative" ref={suggestionsRef}>
              <Input
                id="medication"
                placeholder="Ej: Amoxicilina"
                autoComplete="off"
                {...register("medication")}
                onFocus={() => setShowSuggestions(true)}
                aria-invalid={!!errors.medication}
              />
              {showSuggestions && filteredMeds.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-md max-h-40 overflow-y-auto">
                  {filteredMeds.map((med) => (
                    <button
                      key={med}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setValue("medication", med, { shouldValidate: true });
                        setShowSuggestions(false);
                      }}
                    >
                      {med}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.medication && (
              <p className="text-sm text-destructive">
                {errors.medication.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dose">Dosis</Label>
              <Input
                id="dose"
                placeholder="Ej: 10mg/kg"
                {...register("dose")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="frequency">Frecuencia</Label>
              <Select id="frequency" {...register("frequency")}>
                <option value="">Seleccionar...</option>
                {FREQUENCY_OPTIONS.map((freq) => (
                  <option key={freq} value={freq}>
                    {freq}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="duration">Duracion</Label>
            <Select id="duration" {...register("duration")}>
              <option value="">Seleccionar...</option>
              {DURATION_OPTIONS.map((dur) => (
                <option key={dur} value={dur}>
                  {dur}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notas / Instrucciones</Label>
            <Textarea
              id="notes"
              placeholder="Ej: Administrar con alimento"
              rows={2}
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Agregar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
