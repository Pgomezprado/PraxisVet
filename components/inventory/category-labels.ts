import type {
  ProductCategory,
  ProductUnit,
  StockMovementType,
  StockMovementReason,
} from "@/types";

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  medicine: "Medicamento",
  supply: "Insumo",
  food: "Alimento",
  accessory: "Accesorio",
  other: "Otro",
};

export const UNIT_LABELS: Record<ProductUnit, string> = {
  unit: "Unidad",
  ml: "mL",
  mg: "mg",
  box: "Caja",
  kg: "kg",
  g: "g",
};

export const UNIT_LABELS_PLURAL: Record<ProductUnit, string> = {
  unit: "Unidades",
  ml: "mL",
  mg: "mg",
  box: "Cajas",
  kg: "kg",
  g: "g",
};

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  in: "Entrada",
  out: "Salida",
  adjustment: "Ajuste",
};

export const MOVEMENT_REASON_LABELS: Record<StockMovementReason, string> = {
  purchase: "Compra",
  sale: "Venta",
  usage: "Uso",
  loss: "Perdida",
  return: "Devolucion",
  adjustment: "Ajuste",
};

export const CATEGORY_OPTIONS = [
  { value: "medicine", label: "Medicamento" },
  { value: "supply", label: "Insumo" },
  { value: "food", label: "Alimento" },
  { value: "accessory", label: "Accesorio" },
  { value: "other", label: "Otro" },
] as const;

export const UNIT_OPTIONS = [
  { value: "unit", label: "Unidad" },
  { value: "ml", label: "mL" },
  { value: "mg", label: "mg" },
  { value: "box", label: "Caja" },
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
] as const;

export const MOVEMENT_TYPE_OPTIONS = [
  { value: "in", label: "Entrada" },
  { value: "out", label: "Salida" },
  { value: "adjustment", label: "Ajuste" },
] as const;

export const MOVEMENT_REASON_OPTIONS = [
  { value: "purchase", label: "Compra" },
  { value: "sale", label: "Venta" },
  { value: "usage", label: "Uso" },
  { value: "loss", label: "Perdida" },
  { value: "return", label: "Devolucion" },
  { value: "adjustment", label: "Ajuste" },
] as const;
