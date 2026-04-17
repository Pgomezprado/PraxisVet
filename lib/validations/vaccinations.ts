import { z } from "zod";

export const vaccinationSchema = z.object({
  vaccine_name: z
    .string()
    .min(1, "El nombre de la vacuna es obligatorio")
    .max(2000, "Máximo 2000 caracteres"),
  lot_number: z
    .string()
    .max(2000, "Máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
  date_administered: z.string().min(1, "La fecha de aplicacion es obligatoria"),
  next_due_date: z.string().optional().or(z.literal("")),
  vet_id: z.string().uuid().optional().or(z.literal("")),
  notes: z
    .string()
    .max(2000, "Máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
  pet_id: z.string().uuid("La mascota no es válida"),
  clinical_record_id: z.string().uuid().optional().or(z.literal("")),
  // Nuevos: vinculan la aplicación con el catálogo global.
  vaccine_catalog_id: z.string().uuid().optional().or(z.literal("")),
  protocol_id: z.string().uuid().optional().or(z.literal("")),
  dose_id: z.string().uuid().optional().or(z.literal("")),
});

export type VaccinationInput = z.infer<typeof vaccinationSchema>;

export const COMMON_VACCINES = [
  "Rabia",
  "Parvovirus",
  "Moquillo",
  "Leptospirosis",
  "Hepatitis infecciosa",
  "Parainfluenza",
  "Bordetella",
  "Triple felina (PVR)",
  "Leucemia felina (FeLV)",
  "Panleucopenia felina",
  "Calicivirus felino",
  "Rinotraqueitis felina",
  "Polivalente canina",
  "Polivalente felina",
] as const;
