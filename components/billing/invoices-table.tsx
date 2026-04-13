"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { FilterSelect } from "@/components/ui/filter-select";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status-badge";
import { deleteInvoice } from "@/app/[clinic]/billing/actions";
import type { InvoiceWithClient } from "@/app/[clinic]/billing/actions";
import type { InvoiceStatus } from "@/types";

function formatCurrency(amount: number): string {
  return `$${Number(amount).toFixed(2)}`;
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Borrador" },
  { value: "sent", label: "Enviada" },
  { value: "paid", label: "Pagada" },
  { value: "overdue", label: "Vencida" },
  { value: "cancelled", label: "Cancelada" },
];

interface InvoicesTableProps {
  invoices: InvoiceWithClient[];
  clinicSlug: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  search?: string;
  status?: string;
}

export function InvoicesTable({
  invoices,
  clinicSlug,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  search,
  status,
}: InvoicesTableProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(deleteId);
    setDeleteError(null);
    const result = await deleteInvoice(deleteId);
    if (!result.success) {
      setDeleteError(result.error);
      setDeleting(null);
      return;
    }
    setDialogOpen(false);
    setDeleting(null);
    setDeleteId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SearchInput placeholder="Buscar por cliente o número..." />
        <FilterSelect
          paramName="status"
          options={STATUS_OPTIONS}
          placeholder="Todos los estados"
          className="w-40"
        />
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-sm text-muted-foreground">
            {search || status
              ? "No se encontraron facturas con los filtros aplicados."
              : "No hay facturas registradas."}
          </p>
          {!search && !status && (
            <Link href={`/${clinicSlug}/billing/new`}>
              <Button className="mt-4" size="sm">
                Crear primera factura
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
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
              {invoices.map((inv) => (
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
                          <Dialog
                            open={dialogOpen && deleteId === inv.id}
                            onOpenChange={(open) => {
                              setDialogOpen(open);
                              if (!open) {
                                setDeleteId(null);
                                setDeleteError(null);
                              }
                            }}
                          >
                            <DialogTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => {
                                    setDeleteId(inv.id);
                                    setDialogOpen(true);
                                  }}
                                />
                              }
                            >
                              <Trash2 className="size-3.5 text-destructive" />
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Eliminar factura</DialogTitle>
                                <DialogDescription>
                                  Se eliminará la factura {inv.invoice_number} permanentemente. Esta acción no se puede deshacer.
                                </DialogDescription>
                              </DialogHeader>
                              {deleteError && (
                                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                  {deleteError}
                                </div>
                              )}
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setDialogOpen(false)}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  variant="destructive"
                                  disabled={deleting === inv.id}
                                  onClick={handleDelete}
                                >
                                  {deleting === inv.id ? "Eliminando..." : "Eliminar"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            baseUrl={`/${clinicSlug}/billing`}
            searchParams={{ search, status }}
          />
        </>
      )}
    </div>
  );
}
