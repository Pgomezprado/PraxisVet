import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { InvoiceSummary } from "@/components/billing/invoice-summary";
import { InvoicesTable } from "@/components/billing/invoices-table";
import { getInvoices, getMonthSummary } from "./actions";

export default async function BillingPage({
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
        Organizacion no encontrada.
      </p>
    );
  }

  const [invoicesResult, summaryResult] = await Promise.all([
    getInvoices(org.id),
    getMonthSummary(org.id),
  ]);

  const invoices = invoicesResult.success ? invoicesResult.data : [];
  const summary = summaryResult.success
    ? summaryResult.data
    : { invoiced: 0, collected: 0, pending: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facturacion</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona las facturas y pagos de tu clinica.
          </p>
        </div>
        <Link href={`/${clinic}/billing/new`}>
          <Button>
            <Plus className="size-4" />
            Nueva factura
          </Button>
        </Link>
      </div>

      <InvoiceSummary
        invoiced={summary.invoiced}
        collected={summary.collected}
        pending={summary.pending}
      />

      <InvoicesTable invoices={invoices} clinicSlug={clinic} />
    </div>
  );
}
