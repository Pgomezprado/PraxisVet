"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Ban, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateInvoiceStatus } from "@/app/[clinic]/billing/actions";
import type { InvoiceStatus } from "@/types";

const transitions: Record<
  InvoiceStatus,
  {
    label: string;
    to: InvoiceStatus;
    icon: typeof Send;
    variant: "default" | "outline" | "destructive";
  }[]
> = {
  draft: [
    { label: "Enviar", to: "sent", icon: Send, variant: "default" },
    { label: "Cancelar", to: "cancelled", icon: Ban, variant: "destructive" },
  ],
  sent: [
    {
      label: "Marcar vencida",
      to: "overdue",
      icon: AlertTriangle,
      variant: "outline",
    },
    { label: "Cancelar", to: "cancelled", icon: Ban, variant: "destructive" },
  ],
  overdue: [
    { label: "Cancelar", to: "cancelled", icon: Ban, variant: "destructive" },
  ],
  paid: [],
  cancelled: [
    {
      label: "Reabrir como borrador",
      to: "draft",
      icon: RotateCcw,
      variant: "outline",
    },
  ],
};

export function InvoiceStatusActions({
  invoiceId,
  currentStatus,
  clinicSlug,
  orgId,
}: {
  invoiceId: string;
  currentStatus: InvoiceStatus;
  clinicSlug: string;
  orgId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const available = transitions[currentStatus] ?? [];

  if (available.length === 0) return null;

  async function handleStatusChange(newStatus: InvoiceStatus) {
    setLoading(newStatus);
    const result = await updateInvoiceStatus(orgId, invoiceId, newStatus);
    setLoading(null);

    if (!result.success) {
      alert(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {available.map((action) => {
        const Icon = action.icon;
        const isLoading = loading === action.to;

        return (
          <Button
            key={action.to}
            variant={action.variant}
            size="sm"
            disabled={loading !== null}
            onClick={() => handleStatusChange(action.to)}
          >
            {isLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Icon className="size-3.5" />
            )}
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
