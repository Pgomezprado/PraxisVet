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
