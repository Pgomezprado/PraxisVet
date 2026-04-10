"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Eye, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status-badge";
import { deleteInvoice } from "@/app/[clinic]/billing/actions";
import type { InvoiceWithClient } from "@/app/[clinic]/billing/actions";
import type { InvoiceStatus } from "@/types";

function formatCurrency(amount: number): string {
  return `$${Number(amount).toFixed(2)}`;
}

interface InvoicesTableProps {
  invoices: InvoiceWithClient[];
  clinicSlug: string;
}

export function InvoicesTable({ invoices, clinicSlug }: InvoicesTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = invoices.filter((inv) => {
    const clientName =
      `${inv.client.first_name} ${inv.client.last_name}`.toLowerCase();
    const matchesSearch =
      !search ||
      clientName.includes(search.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function handleDelete(invoiceId: string) {
    if (!confirm("Estas seguro de eliminar esta factura?")) return;
    setDeleting(invoiceId);
    const result = await deleteInvoice(invoiceId);
    if (!result.success) {
      alert(result.error);
    }
    setDeleting(null);
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <p className="text-sm text-muted-foreground">
          No hay facturas registradas.
        </p>
        <Link href={`/${clinicSlug}/billing/new`}>
          <Button className="mt-4" size="sm">
            Crear primera factura
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente o numero..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-40"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="sent">Enviada</option>
          <option value="paid">Pagada</option>
          <option value="overdue">Vencida</option>
          <option value="cancelled">Cancelada</option>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N. Factura</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="font-medium">
                {inv.invoice_number}
              </TableCell>
              <TableCell>
                {inv.client.first_name} {inv.client.last_name}
              </TableCell>
              <TableCell>
                {format(new Date(inv.created_at), "dd MMM yyyy", {
                  locale: es,
                })}
              </TableCell>
              <TableCell>
                <InvoiceStatusBadge
                  status={inv.status as InvoiceStatus}
                />
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(inv.total)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link href={`/${clinicSlug}/billing/${inv.id}`}>
                    <Button variant="ghost" size="icon-sm">
                      <Eye className="size-3.5" />
                    </Button>
                  </Link>
                  {inv.status === "draft" && (
                    <>
                      <Link href={`/${clinicSlug}/billing/${inv.id}/edit`}>
                        <Button variant="ghost" size="icon-sm">
                          <Pencil className="size-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(inv.id)}
                        disabled={deleting === inv.id}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-muted-foreground py-8"
              >
                No se encontraron facturas con los filtros aplicados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
