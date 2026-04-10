import { z } from "zod";

export const prescriptionSchema = z.object({
  clinical_record_id: z.string().uuid("ID de registro clinico invalido"),
  medication: z.string().min(1, "El medicamento es obligatorio"),
  dose: z.string().optional().or(z.literal("")),
  frequency: z.string().optional().or(z.literal("")),
  duration: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type PrescriptionInput = z.infer<typeof prescriptionSchema>;

export const MEDICATION_SUGGESTIONS = [
  "Amoxicilina",
  "Enrofloxacina",
  "Meloxicam",
  "Metronidazol",
  "Dexametasona",
  "Cefalexina",
  "Prednisolona",
  "Ivermectina",
  "Omeprazol",
  "Tramadol",
] as const;

export const FREQUENCY_OPTIONS = [
  "Cada 8 horas",
  "Cada 12 horas",
  "Cada 24 horas",
  "Dosis unica",
] as const;

export const DURATION_OPTIONS = [
  "3 dias",
  "5 dias",
  "7 dias",
  "10 dias",
  "14 dias",
] as const;
