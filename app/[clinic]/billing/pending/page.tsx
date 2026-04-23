import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status-badge";
import { createClient } from "@/lib/supabase/server";
import { getPendingInvoicesByClient } from "../actions";
import { formatCLP } from "@/lib/utils/format";

export default async function PendingInvoicesPage({
  params,
}: {
  params: Promise<{ clinic: string }>;
}) {
  const { clinic } = await params;

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", clinic)
    .single();

  if (!org) {
    return (
      <p className="text-sm text-muted-foreground">
        Organización no encontrada.
      </p>
    );
  }

  const result = await getPendingInvoicesByClient(org.id);
  const groups = result.success ? result.data : [];

  const grandTotal = groups.reduce((sum, g) => sum + g.total_pending, 0);
  const totalInvoices = groups.reduce((sum, g) => sum + g.invoice_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${clinic}/billing`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Saldos pendientes
          </h1>
          <p className="text-sm text-muted-foreground">
            Facturas enviadas, vencidas o con abono parcial agrupadas por
            cliente.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">
              Total adeudado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {formatCLP(grandTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">
              Clientes con saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{groups.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">
              Facturas pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalInvoices}</p>
          </CardContent>
        </Card>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No hay saldos pendientes. Todas las facturas activas están al día.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.client_id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {group.client_name}
                    </CardTitle>
                    {group.client_phone && (
                      <p className="text-xs text-muted-foreground">
                        {group.client_phone}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Saldo total
                    </p>
                    <p className="text-lg font-bold text-amber-600">
                      {formatCLP(group.total_pending)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Factura</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Pagado</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.invoices.map((inv) => {
                      const isOverdue = inv.status === "overdue";
                      return (
                        <TableRow key={inv.id}>
                          <TableCell>
                            <Link
                              href={`/${clinic}/billing/${inv.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {inv.invoice_number}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <InvoiceStatusBadge status={inv.status} />
                          </TableCell>
                          <TableCell>
                            {inv.due_date ? (
                              <span
                                className={
                                  isOverdue
                                    ? "inline-flex items-center gap-1 text-red-600"
                                    : ""
                                }
                              >
                                {isOverdue && (
                                  <AlertTriangle className="size-3.5" />
                                )}
                                {format(
                                  new Date(inv.due_date + "T12:00:00"),
                                  "dd MMM yyyy",
                                  { locale: es }
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCLP(inv.total)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCLP(inv.amount_paid)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-amber-600">
                            {formatCLP(inv.remaining)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
