import { z } from "zod";

export const clinicalRecordSchema = z.object({
  pet_id: z.string().min(1, "La mascota es obligatoria"),
  vet_id: z.string().min(1, "El veterinario es obligatorio"),
  appointment_id: z.string().optional().or(z.literal("")),
  date: z.string().min(1, "La fecha es obligatoria"),
  reason: z.string().min(1, "El motivo de consulta es obligatorio"),
  anamnesis: z.string().optional().or(z.literal("")),
  symptoms: z.string().optional().or(z.literal("")),
  diagnosis: z.string().optional().or(z.literal("")),
  treatment: z.string().optional().or(z.literal("")),
  observations: z.string().optional().or(z.literal("")),
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
});

export type ClinicalRecordInput = z.input<typeof clinicalRecordSchema>;
export type ClinicalRecordParsed = z.output<typeof clinicalRecordSchema>;
