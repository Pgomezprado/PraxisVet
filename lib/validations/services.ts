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

export const SIZE_OPTIONS = [
  { value: "xs", label: "XS — Muy pequeño" },
  { value: "s", label: "S — Pequeño" },
  { value: "m", label: "M — Mediano" },
  { value: "l", label: "L — Grande" },
  { value: "xl", label: "XL — Muy grande" },
] as const;

export const sizeEnum = z.enum(["xs", "s", "m", "l", "xl"]);

export const speciesFilterEnum = z.enum(["canino", "felino", "exotico"]);

export const servicePriceTierSchema = z
  .object({
    label: z.string().min(1, "Ponle un nombre al tier (ej: Perro mediano)"),
    species_filter: speciesFilterEnum.nullable().optional(),
    size: sizeEnum.nullable().optional(),
    weight_min_kg: z
      .number({ error: "Ingresa un número válido" })
      .min(0, "El peso no puede ser negativo")
      .max(999, "Peso fuera de rango")
      .nullable()
      .optional(),
    weight_max_kg: z
      .number({ error: "Ingresa un número válido" })
      .min(0, "El peso no puede ser negativo")
      .max(999, "Peso fuera de rango")
      .nullable()
      .optional(),
    price: z
      .number({ error: "Ingresa un precio válido" })
      .int("El precio debe ser un entero (CLP)")
      .min(0, "El precio no puede ser negativo"),
    active: z.boolean().default(true),
  })
  .refine(
    (data) =>
      data.weight_min_kg == null ||
      data.weight_max_kg == null ||
      data.weight_min_kg <= data.weight_max_kg,
    {
      message: "El peso mínimo no puede ser mayor que el máximo",
      path: ["weight_max_kg"],
    }
  )
  .refine(
    (data) =>
      Boolean(data.species_filter) ||
      Boolean(data.size) ||
      data.weight_min_kg != null ||
      data.weight_max_kg != null,
    {
      message:
        "Define al menos un filtro: especie, talla o rango de peso",
      path: ["species_filter"],
    }
  );

export type ServicePriceTierInput = z.infer<typeof servicePriceTierSchema>;
