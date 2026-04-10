import { z } from "zod";

export const clinicSettingsSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z
    .string()
    .email("Ingresa un email valido")
    .optional()
    .or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});

export type ClinicSettingsInput = z.infer<typeof clinicSettingsSchema>;
