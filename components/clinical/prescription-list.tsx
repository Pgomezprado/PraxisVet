"use client";

import { useState, useEffect, useCallback } from "react";
import { Pill, Pencil, Trash2, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getPrescriptions,
  createPrescription,
  updatePrescription,
  deletePrescription,
} from "@/app/[clinic]/clients/[id]/pets/[petId]/records/[recordId]/prescriptions/actions";
import { PrescriptionForm } from "@/components/clinical/prescription-form";
import type { Prescription } from "@/types";
import type { PrescriptionInput } from "@/lib/validations/prescriptions";

interface PrescriptionListProps {
  recordId: string;
  orgId: string;
  clinicSlug: string;
}

export function PrescriptionList({
  recordId,
  orgId,
  clinicSlug,
}: PrescriptionListProps) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPrescription, setEditingPrescription] =
    useState<Prescription | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getPrescriptions(recordId);
    if (result.success) {
      setPrescriptions(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [recordId]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  async function handleCreate(data: PrescriptionInput) {
    const result = await createPrescription(orgId, clinicSlug, data);
    if (!result.success) {
      throw new Error(result.error);
    }
    await fetchPrescriptions();
  }

  async function handleUpdate(data: PrescriptionInput) {
    if (!editingPrescription) return;
    const { clinical_record_id: _, ...updateData } = data;
    const result = await updatePrescription(
      editingPrescription.id,
      clinicSlug,
      updateData
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    setEditingPrescription(null);
    await fetchPrescriptions();
  }

  async function handleDelete(prescriptionId: string) {
    setDeletingId(prescriptionId);
    const result = await deletePrescription(prescriptionId, clinicSlug);
    if (result.success) {
      setPrescriptions((prev) => prev.filter((p) => p.id !== prescriptionId));
    }
    setDeletingId(null);
  }

  function openEdit(prescription: Prescription) {
    setEditingPrescription(prescription);
    setFormOpen(true);
  }

  function openCreate() {
    setEditingPrescription(null);
    setFormOpen(true);
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Pill className="size-4" />
            Prescripciones
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Pill className="size-4" />
            Prescripciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            <span>Error al cargar prescripciones: {error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={fetchPrescriptions}
          >
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Pill className="size-4" />
            Prescripciones
            {prescriptions.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {prescriptions.length}
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="size-4 mr-1" />
            Agregar medicamento
          </Button>
        </CardHeader>
        <CardContent>
          {prescriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay prescripciones registradas.
            </p>
          ) : (
            <div className="grid gap-3">
              {prescriptions.map((rx, index) => (
                <div key={rx.id}>
                  {index > 0 && <Separator className="mb-3" />}
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid gap-1 min-w-0 flex-1">
                      <p className="font-medium text-sm">{rx.medication}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {rx.dose && <span>Dosis: {rx.dose}</span>}
                        {rx.frequency && <span>Frecuencia: {rx.frequency}</span>}
                        {rx.duration && <span>Duracion: {rx.duration}</span>}
                      </div>
                      {rx.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {rx.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => openEdit(rx)}
                        aria-label={`Editar ${rx.medication}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(rx.id)}
                        disabled={deletingId === rx.id}
                        aria-label={`Eliminar ${rx.medication}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PrescriptionForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingPrescription(null);
        }}
        clinicalRecordId={recordId}
        prescription={editingPrescription}
        onSubmit={editingPrescription ? handleUpdate : handleCreate}
      />
    </>
  );
}
