import { z } from "zod";

export const memberRoles = [
  "admin",
  "vet",
  "receptionist",
  "groomer",
] as const;

export const teamMemberSchema = z.object({
  first_name: z.string().trim().min(1, "El nombre es obligatorio"),
  last_name: z.string().trim().optional().or(z.literal("")),
  role: z.enum(memberRoles),
  specialty: z.string().trim().optional().or(z.literal("")),
  active: z.boolean().optional(),
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
});

export type TeamMemberInput = z.input<typeof teamMemberSchema>;
export type TeamMemberParsed = z.output<typeof teamMemberSchema>;

export const inviteMemberSchema = z.object({
  member_id: z.string().uuid(),
  email: z.string().trim().email("Email inválido"),
});

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(10),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

export const roleLabels: Record<(typeof memberRoles)[number], string> = {
  admin: "Administrador",
  vet: "Veterinario/a",
  receptionist: "Recepcionista",
  groomer: "Peluquero/a",
};

export const roleDescriptions: Record<(typeof memberRoles)[number], string> = {
  admin: "Gestiona el negocio completo: equipo, servicios, reportes y configuración.",
  vet: "Atiende consultas médicas, registra historial clínico y emite recetas.",
  receptionist: "Agenda citas, recibe clientes y gestiona cobros.",
  groomer: "Realiza servicios de peluquería y registra observaciones del animal.",
};
