import { z } from "zod";

export const serviceCategoryEnum = z.enum([
  "consultation",
  "surgery",
  "grooming",
  "vaccine",
  "lab",
  "imaging",
  "other",
]);

export const serviceSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  category: serviceCategoryEnum.optional(),
  duration_minutes: z
    .number({ error: "Ingresa un numero valido" })
    .int("Debe ser un numero entero")
    .min(5, "La duracion minima es 5 minutos"),
  price: z
    .number({ error: "Ingresa un numero valido" })
    .min(0, "El precio no puede ser negativo")
    .optional(),
  active: z.boolean(),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
