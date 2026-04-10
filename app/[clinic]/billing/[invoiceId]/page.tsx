import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  Pencil,
  Send,
  Ban,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status-badge";
import { PaymentDialog } from "@/components/billing/payment-dialog";
import { DownloadPdfButton } from "@/components/pdf/DownloadPdfButton";
import { InvoiceStatusActions } from "./_components/invoice-status-actions";
import { getInvoice } from "../actions";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
};

function formatCurrency(amount: number): string {
  return `$${Number(amount).toFixed(2)}`;
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ clinic: string; invoiceId: string }>;
}) {
  const { clinic, invoiceId } = await params;

  const result = await getInvoice(invoiceId);

  if (!result.success || !result.data) {
    notFound();
  }

  const invoice = result.data;
  const clientName = `${invoice.client.first_name} ${invoice.client.last_name}`;

  const totalPaid = invoice.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  const remaining = Number(invoice.total) - totalPaid;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${clinic}/billing`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {invoice.invoice_number}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {clientName} &middot;{" "}
            {format(new Date(invoice.created_at), "dd MMM yyyy", {
              locale: es,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DownloadPdfButton
            href={`/api/${clinic}/invoices/${invoiceId}/pdf`}
            fileName={`factura-${invoice.invoice_number}.pdf`}
            label="Descargar PDF"
          />
          {invoice.status === "draft" && (
            <Link href={`/${clinic}/billing/${invoiceId}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="size-3.5" />
                Editar
              </Button>
            </Link>
          )}
          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <PaymentDialog
              orgId={invoice.org_id}
              invoiceId={invoice.id}
              remaining={remaining > 0 ? remaining : 0}
            >
              <Button size="sm">
                <DollarSign className="size-3.5" />
                Registrar pago
              </Button>
            </PaymentDialog>
          )}
        </div>
      </div>

      <InvoiceStatusActions
        invoiceId={invoice.id}
        currentStatus={invoice.status}
        clinicSlug={clinic}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Informaci\u00f3n general</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cliente</span>
              <span className="text-sm font-medium">{clientName}</span>
            </div>
            {invoice.client.phone && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Telefono</span>
                <span className="text-sm font-medium">
                  {invoice.client.phone}
                </span>
              </div>
            )}
            {invoice.due_date && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Vencimiento
                </span>
                <span className="text-sm font-medium">
                  {format(new Date(invoice.due_date + "T12:00:00"), "dd MMM yyyy", {
                    locale: es,
                  })}
                </span>
              </div>
            )}
            {invoice.appointment && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cita</span>
                <Link
                  href={`/${clinic}/appointments/${invoice.appointment.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {format(
                    new Date(invoice.appointment.date + "T12:00:00"),
                    "dd MMM yyyy",
                    { locale: es }
                  )}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resumen de pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-sm font-bold">
                {formatCurrency(invoice.total)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pagado</span>
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(totalPaid)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm font-medium">Pendiente</span>
              <span className="text-sm font-bold text-orange-600">
                {formatCurrency(remaining > 0 ? remaining : 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Conceptos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripcion</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unit_price)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">
                  Subtotal
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(invoice.subtotal)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">
                  Impuesto ({invoice.tax_rate}%)
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(invoice.tax_amount)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} className="text-right text-base font-bold">
                  Total
                </TableCell>
                <TableCell className="text-right text-base font-bold">
                  {formatCurrency(invoice.total)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Historial de pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.created_at), "dd MMM yyyy HH:mm", {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell>
                      {payment.method
                        ? PAYMENT_METHOD_LABELS[payment.method] ?? payment.method
                        : "--"}
                    </TableCell>
                    <TableCell>{payment.reference || "--"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
