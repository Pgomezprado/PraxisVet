import { z } from "zod";

/**
 * Valida que el teléfono sea un móvil chileno normalizable a E.164.
 * Acepta cualquier combinación de separadores (espacios, guiones, paréntesis, +).
 * Requisito real: al quitar todo lo no-numérico quedan
 *   - 11 dígitos que empiezan con "569" (ej: "+56 9 1234 5678"), o
 *   - 9 dígitos que empiezan con "9"  (ej: "9 1234 5678")
 */
export function isValidChileanMobile(input: string): boolean {
  const digits = input.replace(/[^0-9]/g, "");
  if (digits.length === 11 && digits.startsWith("569")) return true;
  if (digits.length === 9 && digits.startsWith("9")) return true;
  return false;
}

const optionalPhoneField = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || isValidChileanMobile(val), {
    message: "Ingresa un móvil chileno válido (+56 9 XXXX XXXX)",
  });

export const clientSchema = z.object({
  first_name: z.string().min(1, "El nombre es obligatorio"),
  last_name: z.string().min(1, "El apellido es obligatorio"),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
  phone: optionalPhoneField,
  // Consentimiento explícito Ley 19.628: el caller decide si default true o
  // false. La action setea timestamp/source automáticamente cuando pasa de
  // false a true.
  whatsapp_opt_in: z.boolean().optional(),
  whatsapp_consent_acknowledged: z.boolean().optional(),
  address: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type ClientInput = z.infer<typeof clientSchema>;

export const SPECIES_OPTIONS = [
  { value: "canino", label: "Canino" },
  { value: "felino", label: "Felino" },
  { value: "exotico", label: "Exótico" },
] as const;

const SPECIES_LEGACY_MAP: Record<string, string> = {
  dog: "canino",
  cat: "felino",
  bird: "exotico",
  rabbit: "exotico",
  reptile: "exotico",
  other: "exotico",
};

export function formatSpecies(species: string | null | undefined): string {
  if (!species) return "";
  const normalized = SPECIES_LEGACY_MAP[species] ?? species;
  return (
    SPECIES_OPTIONS.find((s) => s.value === normalized)?.label ?? species
  );
}

export const SEX_OPTIONS = [
  { value: "male", label: "Macho" },
  { value: "female", label: "Hembra" },
] as const;

const REPRODUCTIVE_STATUS_LABELS = {
  male: { intact: "Entero", sterilized: "Castrado" },
  female: { intact: "Entera", sterilized: "Esterilizada" },
} as const;

export function getReproductiveStatusOptions(
  sex: string | null | undefined
): ReadonlyArray<{ value: "intact" | "sterilized"; label: string }> {
  if (sex !== "male" && sex !== "female") return [];
  return [
    { value: "intact", label: REPRODUCTIVE_STATUS_LABELS[sex].intact },
    { value: "sterilized", label: REPRODUCTIVE_STATUS_LABELS[sex].sterilized },
  ];
}

export function formatReproductiveStatus(
  status: string | null | undefined,
  sex: string | null | undefined
): string {
  if (!status) return "";
  if (sex !== "male" && sex !== "female") return "";
  if (status !== "intact" && status !== "sterilized") return "";
  return REPRODUCTIVE_STATUS_LABELS[sex][status];
}

export const petSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  species: z.enum(["canino", "felino", "exotico"]).optional().or(z.literal("")),
  breed: z.string().optional().or(z.literal("")),
  color: z.string().optional().or(z.literal("")),
  sex: z.enum(["male", "female"]).optional().or(z.literal("")),
  birthdate: z.string().optional().or(z.literal("")),
  microchip: z.string().optional().or(z.literal("")),
  reproductive_status: z
    .enum(["intact", "sterilized"])
    .optional()
    .or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  photo_url: z.string().url().nullable().optional(),
  size: z
    .enum(["xs", "s", "m", "l", "xl"])
    .optional()
    .or(z.literal("")),
  weight: z
    .number({ error: "Ingresa un peso válido" })
    .min(0, "El peso no puede ser negativo")
    .max(999, "Peso fuera de rango")
    .nullable()
    .optional(),
});

export type PetInput = z.infer<typeof petSchema>;

/**
 * Schema combinado para el onboarding de un nuevo tutor con su primer paciente.
 * Usado solo en /clients/new. La edición sigue usando clientSchema.
 */
export const newTutorWithPetSchema = clientSchema.extend({
  pet_name: z.string().min(1, "El nombre del paciente es obligatorio"),
  pet_species: z
    .enum(["canino", "felino", "exotico"])
    .optional()
    .or(z.literal("")),
  pet_breed: z.string().optional().or(z.literal("")),
  pet_color: z.string().optional().or(z.literal("")),
  pet_sex: z.enum(["male", "female"]).optional().or(z.literal("")),
  pet_birthdate: z.string().optional().or(z.literal("")),
  pet_microchip: z.string().optional().or(z.literal("")),
  pet_reproductive_status: z
    .enum(["intact", "sterilized"])
    .optional()
    .or(z.literal("")),
  pet_notes: z.string().optional().or(z.literal("")),
  pet_photo_url: z.string().url().nullable().optional(),
});

export type NewTutorWithPetInput = z.infer<typeof newTutorWithPetSchema>;
