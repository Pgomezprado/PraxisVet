import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/types";

const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: {
    label: "Borrador",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400",
  },
  sent: {
    label: "Enviada",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  paid: {
    label: "Pagada",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  overdue: {
    label: "Vencida",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-gray-200 text-gray-600 dark:bg-gray-700/40 dark:text-gray-500",
  },
};

export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: InvoiceStatus;
  className?: string;
}) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  return statusConfig[status]?.label ?? status;
}
