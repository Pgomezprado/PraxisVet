import { z } from "zod";
import { physicalExamSchema } from "./physical-exam";

export const clinicalRecordSchema = z.object({
  pet_id: z.string().min(1, "La mascota es obligatoria"),
  vet_id: z.string().min(1, "El veterinario es obligatorio"),
  appointment_id: z.string().optional().or(z.literal("")),
  date: z.string().min(1, "La fecha es obligatoria"),
  reason: z
    .string()
    .min(1, "El motivo de consulta es obligatorio")
    .max(2000, "Máximo 2000 caracteres"),
  anamnesis: z
    .string()
    .max(2000, "Máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
  symptoms: z
    .string()
    .max(2000, "Máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
  diagnosis: z
    .string()
    .max(2000, "Máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
  treatment: z
    .string()
    .max(2000, "Máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
  observations: z
    .string()
    .max(2000, "Máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
  weight: z.coerce
    .number()
    .positive("El peso debe ser positivo")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  temperature: z.coerce
    .number()
    .positive("La temperatura debe ser positiva")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  heart_rate: z.coerce
    .number()
    .int()
    .positive("La frecuencia debe ser positiva")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  respiratory_rate: z.coerce
    .number()
    .int()
    .positive("La frecuencia respiratoria debe ser positiva")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  capillary_refill_seconds: z.coerce
    .number()
    .nonnegative("El TLLC no puede ser negativo")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  skin_fold_seconds: z.coerce
    .number()
    .nonnegative("El pliegue cutáneo no puede ser negativo")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  physical_exam: physicalExamSchema.optional(),
});

export type ClinicalRecordInput = z.input<typeof clinicalRecordSchema>;
export type ClinicalRecordParsed = z.output<typeof clinicalRecordSchema>;
