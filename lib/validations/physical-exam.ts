import { z } from "zod";

// ============================================
// Enums del examen físico (Excel clínica — 2026-04-16)
// ============================================

export const MUCOUS_COLORS = [
  "rosadas",
  "pálidas",
  "ictéricas",
  "cianóticas",
  "congestivas",
] as const;

export const EAR_INSPECTIONS = [
  "normal",
  "cerumen",
  "otitis",
  "otro",
] as const;

export const COUGH_REFLEXES = ["negativo", "positivo"] as const;

export const LYMPH_NODES = [
  "normales",
  "aumentados",
  "no_palpables",
] as const;

export const ABDOMINAL_PALPATIONS = [
  "normal",
  "dolor",
  "masa",
  "otro",
] as const;

export const CONSCIOUSNESS_LEVELS = [
  "alerta",
  "deprimido",
  "estuporoso",
  "comatoso",
] as const;

export const physicalExamSchema = z
  .object({
    mucous_color: z.enum(MUCOUS_COLORS).optional(),
    ear_inspection: z.enum(EAR_INSPECTIONS).optional(),
    ear_notes: z.string().max(2000, "Máximo 2000 caracteres").optional(),
    cough_reflex: z.enum(COUGH_REFLEXES).optional(),
    lymph_nodes: z.enum(LYMPH_NODES).optional(),
    lymph_nodes_notes: z.string().max(2000, "Máximo 2000 caracteres").optional(),
    abdominal_palpation: z.enum(ABDOMINAL_PALPATIONS).optional(),
    abdominal_palpation_notes: z
      .string()
      .max(2000, "Máximo 2000 caracteres")
      .optional(),
    consciousness: z.enum(CONSCIOUSNESS_LEVELS).optional(),
  })
  .strict();

export type PhysicalExam = z.infer<typeof physicalExamSchema>;
