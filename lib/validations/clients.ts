import { z } from "zod";

export const clientSchema = z.object({
  first_name: z.string().min(1, "El nombre es obligatorio"),
  last_name: z.string().min(1, "El apellido es obligatorio"),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type ClientInput = z.infer<typeof clientSchema>;

export const SPECIES_OPTIONS = [
  { value: "dog", label: "Perro" },
  { value: "cat", label: "Gato" },
  { value: "bird", label: "Ave" },
  { value: "rabbit", label: "Conejo" },
  { value: "reptile", label: "Reptil" },
  { value: "other", label: "Otro" },
] as const;

export const SEX_OPTIONS = [
  { value: "male", label: "Macho" },
  { value: "female", label: "Hembra" },
] as const;

export const petSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  species: z.enum(["dog", "cat", "bird", "rabbit", "reptile", "other"]).optional().or(z.literal("")),
  breed: z.string().optional().or(z.literal("")),
  color: z.string().optional().or(z.literal("")),
  sex: z.enum(["male", "female"]).optional().or(z.literal("")),
  birthdate: z.string().optional().or(z.literal("")),
  microchip: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type PetInput = z.infer<typeof petSchema>;
