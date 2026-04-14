import { z } from "zod";

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "La descripcion es obligatoria"),
  quantity: z.number().min(1, "La cantidad minima es 1"),
  unit_price: z.number().min(0, "El precio no puede ser negativo"),
  item_type: z.enum(["service", "product"]).optional(),
});

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

export const invoiceSchema = z.object({
  client_id: z.string().min(1, "Selecciona un cliente"),
  appointment_id: z.string().optional(),
  tax_rate: z.number().min(0).max(100).default(19),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "Agrega al menos un concepto"),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const invoiceUpdateSchema = z.object({
  tax_rate: z.number().min(0).max(100).optional(),
  due_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;

export const paymentSchema = z.object({
  amount: z.number().min(0.01, "El monto minimo es $0.01").max(99_999_999_999),
  method: z.enum(["cash", "card", "transfer", "other"], {
    message: "Selecciona un metodo de pago",
  }),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
