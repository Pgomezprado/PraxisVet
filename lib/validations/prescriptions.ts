import { z } from "zod";

export const prescriptionSchema = z.object({
  clinical_record_id: z.string().uuid("ID de registro clinico invalido"),
  medication: z.string().min(1, "El medicamento es obligatorio"),
  dose: z.string().optional().or(z.literal("")),
  frequency: z.string().optional().or(z.literal("")),
  duration: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  is_retained: z.boolean().optional(),
});

export type PrescriptionInput = z.infer<typeof prescriptionSchema>;

// Fármacos veterinarios de uso frecuente en Chile. Lista mantenida manualmente;
// si la clínica pide expansión, migrar a tabla editable en Settings.
export const MEDICATION_SUGGESTIONS = [
  "Amoxicilina",
  "Amoxicilina + Ácido clavulánico",
  "Ampicilina",
  "Azitromicina",
  "Cefalexina",
  "Cefovecina",
  "Ciprofloxacino",
  "Clindamicina",
  "Doxiciclina",
  "Enrofloxacina",
  "Gentamicina",
  "Marbofloxacina",
  "Metronidazol",
  "Sulfadiazina + Trimetoprim",
  "Tilosina",
  "Carprofeno",
  "Firocoxib",
  "Ketoprofeno",
  "Meloxicam",
  "Robenacoxib",
  "Tramadol",
  "Buprenorfina",
  "Gabapentina",
  "Dexametasona",
  "Prednisolona",
  "Prednisona",
  "Difenhidramina",
  "Clorfenamina",
  "Famotidina",
  "Omeprazol",
  "Ranitidina",
  "Sucralfato",
  "Maropitant",
  "Metoclopramida",
  "Ondansetrón",
  "Furosemida",
  "Espironolactona",
  "Enalapril",
  "Benazepril",
  "Pimobendan",
  "Ivermectina",
  "Milbemicina oxima",
  "Selamectina",
  "Fipronil",
  "Praziquantel",
  "Pirantel",
  "Fenbendazol",
  "Fluconazol",
  "Itraconazol",
  "Ketoconazol",
  "Levotiroxina",
  "Insulina glargina",
  "Fenobarbital",
  "Diazepam",
] as const;

export const FREQUENCY_OPTIONS = [
  "Cada 8 horas",
  "Cada 12 horas",
  "Cada 24 horas",
  "Dosis unica",
] as const;

export const DURATION_OPTIONS = [
  "3 dias",
  "5 dias",
  "7 dias",
  "10 dias",
  "14 dias",
  "21 dias",
  "30 dias",
] as const;
