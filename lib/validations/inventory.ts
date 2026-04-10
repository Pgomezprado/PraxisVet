import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  sku: z.string().optional().or(z.literal("")),
  category: z
    .enum(["medicine", "supply", "food", "accessory", "other"])
    .optional()
    .or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  unit: z.enum(["unit", "ml", "mg", "box", "kg", "g"]),
  purchase_price: z.string().optional().or(z.literal("")),
  sale_price: z.string().optional().or(z.literal("")),
  min_stock: z.string().optional().or(z.literal("")),
});

export type ProductInput = z.infer<typeof productSchema>;

export const stockMovementSchema = z.object({
  product_id: z.string().min(1, "El producto es obligatorio"),
  type: z.enum(["in", "out", "adjustment"]),
  quantity: z.string().min(1, "La cantidad es obligatoria"),
  reason: z
    .enum(["purchase", "sale", "usage", "loss", "return", "adjustment"])
    .optional()
    .or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type StockMovementInput = z.infer<typeof stockMovementSchema>;
