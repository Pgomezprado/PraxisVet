import { z } from "zod";

export const customBreedSchema = z.object({
  species: z.enum(["canino", "felino", "exotico"], {
    error: "Selecciona una especie",
  }),
  name: z
    .string()
    .min(1, "Escribe el nombre de la raza")
    .max(80, "El nombre es muy largo")
    .transform((v) => v.trim()),
});

export type CustomBreedInput = z.infer<typeof customBreedSchema>;
