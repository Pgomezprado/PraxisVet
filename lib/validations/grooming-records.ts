import { z } from "zod";

export const groomingRecordSchema = z.object({
  pet_id: z.string().min(1, "La mascota es obligatoria"),
  groomer_id: z.string().min(1, "El peluquero es obligatorio"),
  appointment_id: z.string().optional().or(z.literal("")),
  date: z.string().min(1, "La fecha es obligatoria"),
  service_performed: z.string().min(1, "Indica qué servicio realizaste"),
  observations: z.string().optional().or(z.literal("")),
  price: z
    .union([z.coerce.number().int().min(0), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined || v === null ? null : v)),
});

export type GroomingRecordInput = z.input<typeof groomingRecordSchema>;
export type GroomingRecordParsed = z.output<typeof groomingRecordSchema>;
