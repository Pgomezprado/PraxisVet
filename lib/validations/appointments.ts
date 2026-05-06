import { z } from "zod";

export const appointmentSchema = z
  .object({
    client_id: z.string().min(1, "Selecciona un cliente"),
    pet_id: z.string().min(1, "Selecciona una mascota"),
    assigned_to: z.string().min(1, "Selecciona un profesional"),
    type: z.enum(["medical", "grooming"]),
    service_id: z.string().optional(),
    date: z.string().min(1, "Selecciona una fecha"),
    start_time: z.string().min(1, "Selecciona hora de inicio"),
    end_time: z.string().min(1, "Selecciona hora de fin"),
    reason: z.string().optional(),
    notes: z.string().optional(),
    is_dangerous: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return data.end_time > data.start_time;
      }
      return true;
    },
    {
      message: "La hora de fin debe ser posterior a la hora de inicio",
      path: ["end_time"],
    }
  );

export type AppointmentInput = z.infer<typeof appointmentSchema>;

export const updateStatusSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "in_progress",
    "ready_for_pickup",
    "completed",
    "cancelled",
    "no_show",
  ]),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const DEPOSIT_METHODS = ["cash", "payment_link", "transfer"] as const;
export type DepositMethodValue = (typeof DEPOSIT_METHODS)[number];

export const DEPOSIT_METHOD_LABELS: Record<DepositMethodValue, string> = {
  cash: "Presencial (efectivo)",
  payment_link: "Link de pago",
  transfer: "Transferencia",
};

export const depositSchema = z
  .object({
    amount: z
      .number()
      .int("El monto debe ser entero (CLP)")
      .positive("El monto debe ser mayor a 0"),
    method: z.enum(DEPOSIT_METHODS, {
      error: "Selecciona el medio de pago",
    }),
    reference: z
      .string()
      .trim()
      .max(120, "Referencia demasiado larga")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) =>
      data.method === "cash" || (data.reference && data.reference.length > 0),
    {
      message:
        "Para link de pago o transferencia debes anotar un n° de referencia",
      path: ["reference"],
    }
  );

export type DepositInput = z.infer<typeof depositSchema>;
