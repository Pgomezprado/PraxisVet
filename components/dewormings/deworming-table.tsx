"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { DewormingWithVet } from "@/app/[clinic]/clients/[id]/pets/[petId]/dewormings/actions";
import { deleteDeworming } from "@/app/[clinic]/clients/[id]/pets/[petId]/dewormings/actions";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function vetName(firstName: string | null, lastName: string | null): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "-";
}

type DueStatus = "vigente" | "por_vencer" | "vencida" | null;
function getStatus(nextDueDate: string | null): DueStatus {
  if (!nextDueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDueDate + "T00:00:00");
  const diffDays = Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return "vencida";
  if (diffDays <= 14) return "por_vencer";
  return "vigente";
}

interface DewormingTableProps {
  dewormings: DewormingWithVet[];
  basePath: string;
}

export function DewormingTable({ dewormings, basePath }: DewormingTableProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!selectedId) return;
    setDeleting(selectedId);
    setError(null);
    const result = await deleteDeworming(selectedId, basePath);
    if (!result.success) {
      setError(result.error);
      setDeleting(null);
      return;
    }
    setDialogOpen(false);
    setDeleting(null);
    setSelectedId(null);
    router.refresh();
  }

  if (dewormings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No hay desparasitaciones registradas para esta mascota.
        </p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Próxima fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Veterinario</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dewormings.map((d) => {
              const status = getStatus(d.next_due_date);
              return (
                <TableRow
                  key={d.id}
                  className={
                    status === "vencida"
                      ? "bg-red-50/50 dark:bg-red-950/10"
                      : status === "por_vencer"
                        ? "bg-amber-50/50 dark:bg-amber-950/10"
                        : ""
                  }
                >
                  <TableCell>{formatDate(d.date_administered)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={d.type === "interna" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {d.type}
                    </Badge>
                    {d.pregnant_cohabitation && (
                      <Badge variant="outline" className="ml-1 text-xs">
                        embarazada
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {d.product || "-"}
                  </TableCell>
                  <TableCell>
                    {d.next_due_date ? formatDate(d.next_due_date) : "-"}
                  </TableCell>
                  <TableCell>
                    {status === "vencida" && (
                      <Badge variant="destructive">Vencida</Badge>
                    )}
                    {status === "por_vencer" && (
                      <Badge
                        variant="outline"
                        className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                      >
                        Próxima
                      </Badge>
                    )}
                    {status === "vigente" && (
                      <Badge variant="default">Vigente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {vetName(d.vet_first_name, d.vet_last_name)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => router.push(`${basePath}/${d.id}/edit`)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Dialog
                        open={dialogOpen && selectedId === d.id}
                        onOpenChange={(open) => {
                          setDialogOpen(open);
                          if (!open) setSelectedId(null);
                        }}
                      >
                        <DialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelectedId(d.id);
                                setDialogOpen(true);
                              }}
                            />
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Eliminar desparasitación</DialogTitle>
                            <DialogDescription>
                              Se eliminará el registro del{" "}
                              {formatDate(d.date_administered)}. Esta acción no
                              se puede deshacer.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setDialogOpen(false)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              variant="destructive"
                              disabled={deleting === d.id}
                              onClick={handleDelete}
                            >
                              {deleting === d.id
                                ? "Eliminando..."
                                : "Eliminar"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
