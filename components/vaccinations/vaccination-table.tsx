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
import type { VaccinationWithVet } from "@/app/[clinic]/clients/[id]/pets/[petId]/vaccinations/actions";
import { deleteVaccination } from "@/app/[clinic]/clients/[id]/pets/[petId]/vaccinations/actions";

type VaccinationStatus = "vigente" | "por_vencer" | "vencida";

function getVaccinationStatus(nextDueDate: string | null): VaccinationStatus | null {
  if (!nextDueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDueDate + "T00:00:00");
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "vencida";
  if (diffDays <= 30) return "por_vencer";
  return "vigente";
}

function StatusBadge({ status }: { status: VaccinationStatus | null }) {
  if (!status) return null;

  const config = {
    vigente: { label: "Vigente", variant: "default" as const },
    por_vencer: { label: "Próxima", variant: "outline" as const, className: "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
    vencida: { label: "Vencida", variant: "destructive" as const },
  };

  const { label, variant, className } = config[status] as { label: string; variant: "default" | "outline" | "destructive"; className?: string };

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function vetName(firstName: string | null, lastName: string | null): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "-";
}

interface VaccinationTableProps {
  vaccinations: VaccinationWithVet[];
  basePath: string;
}

export function VaccinationTable({ vaccinations, basePath }: VaccinationTableProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!selectedId) return;
    setDeleting(selectedId);
    setError(null);

    const result = await deleteVaccination(selectedId, basePath);
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

  if (vaccinations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No hay vacunas registradas para esta mascota.
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
              <TableHead>Vacuna</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Próxima dosis</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Veterinario</TableHead>
              <TableHead className="w-25">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vaccinations.map((vac) => {
              const status = getVaccinationStatus(vac.next_due_date);
              return (
                <TableRow
                  key={vac.id}
                  className={
                    status === "vencida"
                      ? "bg-red-50/50 dark:bg-red-950/10"
                      : status === "por_vencer"
                        ? "bg-amber-50/50 dark:bg-amber-950/10"
                        : ""
                  }
                >
                  <TableCell>{formatDate(vac.date_administered)}</TableCell>
                  <TableCell className="font-medium">{vac.vaccine_name}</TableCell>
                  <TableCell>{vac.lot_number || "-"}</TableCell>
                  <TableCell>
                    {vac.next_due_date ? formatDate(vac.next_due_date) : "-"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={status} />
                  </TableCell>
                  <TableCell>
                    {vetName(vac.vet_first_name, vac.vet_last_name)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() =>
                          router.push(`${basePath}/${vac.id}/edit`)
                        }
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Dialog
                        open={dialogOpen && selectedId === vac.id}
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
                                setSelectedId(vac.id);
                                setDialogOpen(true);
                              }}
                            />
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Eliminar vacuna</DialogTitle>
                            <DialogDescription>
                              Se eliminará el registro de {vac.vaccine_name} del{" "}
                              {formatDate(vac.date_administered)}. Esta acción no se
                              puede deshacer.
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
                              disabled={deleting === vac.id}
                              onClick={handleDelete}
                            >
                              {deleting === vac.id ? "Eliminando..." : "Eliminar"}
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
