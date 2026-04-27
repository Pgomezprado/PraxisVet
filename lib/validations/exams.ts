import { z } from "zod";

// Espejo del enum SQL public.exam_type
export const examTypeEnum = z.enum([
  "hemograma",
  "perfil_bioquimico",
  "urianalisis",
  "rayos_x",
  "ecografia",
  "citologia",
  "biopsia",
  "otro",
]);

export const examStatusEnum = z.enum(["solicitado", "resultado_cargado"]);

// MIME types permitidos por el bucket exam-files (espejo de la migración).
export const allowedExamMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const requestExamSchema = z
  .object({
    type: examTypeEnum,
    custom_type_label: z
      .string()
      .max(120, "Máximo 120 caracteres")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    indications: z
      .string()
      .max(2000, "Máximo 2000 caracteres")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    clinical_record_id: z
      .string()
      .uuid("Identificador de ficha inválido")
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .superRefine((val, ctx) => {
    if (val.type === "otro") {
      const label = val.custom_type_label?.trim();
      if (!label) {
        ctx.addIssue({
          code: "custom",
          path: ["custom_type_label"],
          message: 'Cuando el tipo es "otro" debes indicar el nombre del examen',
        });
      }
    }
  });

export const uploadExamResultSchema = z.object({
  // Path dentro del bucket exam-files (NO URL pública). El cliente lo recibe
  // del upload contra Supabase Storage y lo manda al server para persistirlo.
  file_url: z
    .string()
    .min(1, "Falta el archivo del resultado")
    .max(500, "Ruta de archivo demasiado larga"),
  file_name: z
    .string()
    .min(1, "Falta el nombre del archivo")
    .max(200, "Nombre de archivo demasiado largo"),
  file_type: z
    .string()
    .min(1, "Falta el tipo de archivo")
    .refine(
      (v) => (allowedExamMimeTypes as readonly string[]).includes(v),
      "Tipo de archivo no permitido (solo PDF, JPG, PNG o WebP)"
    ),
  result_date: z
    .string()
    .min(1, "La fecha del resultado es obligatoria")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
  vet_interpretation: z
    .string()
    .max(4000, "Máximo 4000 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const updateInterpretationSchema = z.object({
  vet_interpretation: z
    .string()
    .min(1, "La interpretación no puede estar vacía")
    .max(4000, "Máximo 4000 caracteres"),
});

export type RequestExamInput = z.input<typeof requestExamSchema>;
export type RequestExamParsed = z.output<typeof requestExamSchema>;
export type UploadExamResultInput = z.input<typeof uploadExamResultSchema>;
export type UploadExamResultParsed = z.output<typeof uploadExamResultSchema>;
export type UpdateInterpretationInput = z.input<typeof updateInterpretationSchema>;
