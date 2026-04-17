import { z } from "zod";

export const DEWORMING_TYPES = ["interna", "externa"] as const;
export type DewormingType = (typeof DEWORMING_TYPES)[number];

export const dewormingSchema = z.object({
  pet_id: z.string().uuid("La mascota no es válida"),
  clinical_record_id: z.string().uuid().optional().or(z.literal("")),
  vet_id: z.string().uuid().optional().or(z.literal("")),
  type: z.enum(DEWORMING_TYPES, {
    message: "El tipo debe ser interna o externa",
  }),
  date_administered: z
    .string()
    .min(1, "La fecha de aplicación es obligatoria"),
  product: z
    .string()
    .max(2000, "Máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
  next_due_date: z.string().optional().or(z.literal("")),
  pregnant_cohabitation: z
    .boolean()
    .optional()
    .default(false),
  notes: z
    .string()
    .max(2000, "Máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
});

export type DewormingInput = z.input<typeof dewormingSchema>;
export type DewormingParsed = z.output<typeof dewormingSchema>;
