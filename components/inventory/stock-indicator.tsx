import { cn } from "@/lib/utils";
import type { ProductUnit } from "@/types";
import { UNIT_LABELS, UNIT_LABELS_PLURAL } from "./category-labels";

interface StockIndicatorProps {
  quantity: number;
  minStock: number;
  unit: ProductUnit;
  size?: "sm" | "lg";
}

function getStockStatus(quantity: number, minStock: number) {
  if (quantity <= minStock) return "critical";
  if (quantity <= minStock * 1.5) return "warning";
  return "ok";
}

export function StockIndicator({
  quantity,
  minStock,
  unit,
  size = "sm",
}: StockIndicatorProps) {
  const status = getStockStatus(quantity, minStock);

  const unitLabel =
    quantity === 1 ? UNIT_LABELS[unit] : UNIT_LABELS_PLURAL[unit];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        size === "lg" && "text-2xl",
        size === "sm" && "text-sm",
        status === "ok" && "text-green-700 dark:text-green-400",
        status === "warning" && "text-yellow-700 dark:text-yellow-400",
        status === "critical" && "text-red-700 dark:text-red-400"
      )}
    >
      <span
        className={cn(
          "inline-block rounded-full",
          size === "lg" ? "size-3" : "size-2",
          status === "ok" && "bg-green-500",
          status === "warning" && "bg-yellow-500",
          status === "critical" && "bg-red-500"
        )}
      />
      {quantity} {unitLabel}
    </span>
  );
}
