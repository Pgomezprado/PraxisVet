import { z } from "zod";

export const vaccinationSchema = z.object({
  vaccine_name: z.string().min(1, "El nombre de la vacuna es obligatorio"),
  lot_number: z.string().optional().or(z.literal("")),
  date_administered: z.string().min(1, "La fecha de aplicacion es obligatoria"),
  next_due_date: z.string().optional().or(z.literal("")),
  vet_id: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  pet_id: z.string().min(1, "La mascota es obligatoria"),
  clinical_record_id: z.string().optional().or(z.literal("")),
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
