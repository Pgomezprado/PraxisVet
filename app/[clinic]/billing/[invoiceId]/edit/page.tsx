import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInvoice, getClients } from "../../actions";
import { EditInvoiceForm } from "./_components/edit-invoice-form";

export default async function EditInvoicePage({
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

  if (invoice.status !== "draft") {
    redirect(`/${clinic}/billing/${invoiceId}`);
  }

  const clientsResult = await getClients(invoice.org_id);
  const clients = clientsResult.success ? clientsResult.data : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${clinic}/billing/${invoiceId}`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Editar {invoice.invoice_number}
          </h1>
          <p className="text-sm text-muted-foreground">
            Modifica los datos de la factura en borrador.
          </p>
        </div>
      </div>

      <EditInvoiceForm
        invoice={invoice}
        clients={clients}
        clinicSlug={clinic}
      />
    </div>
  );
}
