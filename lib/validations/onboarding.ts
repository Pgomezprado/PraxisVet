import { z } from "zod";

const RESERVED_SLUGS = [
  "admin",
  "api",
  "auth",
  "onboarding",
  "settings",
  "app",
  "dashboard",
  "help",
  "support",
  "www",
  "billing",
  "pricing",
];

export const onboardingSchema = z.object({
  clinicName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  slug: z
    .string()
    .min(3, "El slug debe tener al menos 3 caracteres")
    .max(50, "El slug no puede tener mas de 50 caracteres")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Solo letras minusculas, numeros y guiones"
    )
    .refine((val) => !RESERVED_SLUGS.includes(val), {
      message: "Este nombre esta reservado",
    }),
  phone: z.string().optional(),
  address: z.string().optional(),
  firstName: z.string().min(1, "Ingresa tu nombre"),
  lastName: z.string().min(1, "Ingresa tu apellido"),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
