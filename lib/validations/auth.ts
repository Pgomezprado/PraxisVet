import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ingresa un email valido"),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z.string().email("Ingresa un email valido"),
    password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Ingresa un email valido"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
