import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ArrowRight, CheckCircle2 } from "lucide-react";
import { formatCLP } from "@/lib/utils/format";
import type { PendingPayment } from "@/app/[clinic]/dashboard/queries";

export function PendingPaymentsWidget({
  payments,
  clinicSlug,
}: {
  payments: PendingPayment[];
  clinicSlug: string;
}) {
  const total = payments.reduce((sum, p) => sum + p.total, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <DollarSign className="size-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-base font-semibold">
              Cobros pendientes
            </CardTitle>
          </div>
          {payments.length > 0 && (
            <Badge variant="secondary">{formatCLP(total)}</Badge>
          )}
        </div>
        <CardDescription>
          {payments.length === 0
            ? "Sin cobros pendientes hoy"
            : `${payments.length} factura${payments.length > 1 ? "s" : ""} por cobrar`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/30 bg-primary/5 py-8 text-center">
            <CheckCircle2 className="mb-2 size-8 text-primary" />
            <p className="text-sm font-medium">Todo al día</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {payments.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/${clinicSlug}/billing/${p.id}`}
                  className="group flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {p.client
                        ? `${p.client.first_name} ${p.client.last_name}`
                        : "Cliente sin nombre"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #{p.invoice_number}
                      {p.status === "overdue" && (
                        <span className="ml-2 font-semibold text-rose-600 dark:text-rose-400">
                          · vencida
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCLP(p.total)}
                    </span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
