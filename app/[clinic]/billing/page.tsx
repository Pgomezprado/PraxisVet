import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { InvoiceSummary } from "@/components/billing/invoice-summary";
import { InvoicesTable } from "@/components/billing/invoices-table";
import { getInvoices, getMonthSummary } from "./actions";
import type { InvoiceStatus } from "@/types";

const PAGE_SIZE = 25;

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}) {
  const { clinic } = await params;
  const { page: pageParam, search, status } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

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

  const [invoicesResult, summaryResult] = await Promise.all([
    getInvoices(org.id, {
      page,
      pageSize: PAGE_SIZE,
      search,
      status: status as InvoiceStatus | undefined,
    }),
    getMonthSummary(org.id),
  ]);

  const invoices = invoicesResult.success ? invoicesResult.data.data : [];
  const total = invoicesResult.success ? invoicesResult.data.total : 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const summary = summaryResult.success
    ? summaryResult.data
    : { invoiced: 0, collected: 0, pending: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facturación</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona las facturas y pagos de tu clínica.
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

      <InvoicesTable
        invoices={invoices}
        clinicSlug={clinic}
        orgId={org.id}
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
        search={search}
        status={status}
      />
    </div>
  );
}
