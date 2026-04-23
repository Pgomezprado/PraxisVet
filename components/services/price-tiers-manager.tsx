"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
} from "@/components/ui/dialog";
import { SPECIES_OPTIONS } from "@/lib/validations/clients";
import {
  SIZE_OPTIONS,
  type ServicePriceTierInput,
} from "@/lib/validations/services";
import {
  listServicePriceTiers,
  createServicePriceTier,
  updateServicePriceTier,
  deleteServicePriceTier,
} from "@/app/[clinic]/settings/services/actions";
import type { ServicePriceTier } from "@/types";
import { formatCLP } from "@/lib/utils/format";

const SIZE_LABEL: Record<string, string> = Object.fromEntries(
  SIZE_OPTIONS.map((o) => [o.value, o.label.split(" — ")[0]])
);

const SPECIES_LABEL: Record<string, string> = Object.fromEntries(
  SPECIES_OPTIONS.map((o) => [o.value, o.label])
);

type TierFormState = {
  label: string;
  species_filter: string;
  size: string;
  weight_min_kg: string;
  weight_max_kg: string;
  price: string;
  active: boolean;
};

const EMPTY_FORM: TierFormState = {
  label: "",
  species_filter: "",
  size: "",
  weight_min_kg: "",
  weight_max_kg: "",
  price: "",
  active: true,
};

function tierToForm(tier: ServicePriceTier): TierFormState {
  return {
    label: tier.label,
    species_filter: tier.species_filter ?? "",
    size: tier.size ?? "",
    weight_min_kg: tier.weight_min_kg !== null ? String(tier.weight_min_kg) : "",
    weight_max_kg: tier.weight_max_kg !== null ? String(tier.weight_max_kg) : "",
    price: String(tier.price),
    active: tier.active,
  };
}

function formToInput(form: TierFormState): ServicePriceTierInput {
  return {
    label: form.label.trim(),
    species_filter: (form.species_filter || null) as
      | "canino"
      | "felino"
      | "exotico"
      | null,
    size: (form.size || null) as
      | "xs"
      | "s"
      | "m"
      | "l"
      | "xl"
      | null,
    weight_min_kg: form.weight_min_kg ? Number(form.weight_min_kg) : null,
    weight_max_kg: form.weight_max_kg ? Number(form.weight_max_kg) : null,
    price: form.price ? Math.round(Number(form.price)) : 0,
    active: form.active,
  };
}

function describeTier(tier: ServicePriceTier): string {
  const parts: string[] = [];
  if (tier.species_filter) parts.push(SPECIES_LABEL[tier.species_filter]);
  if (tier.size) parts.push(`Talla ${SIZE_LABEL[tier.size]}`);
  if (tier.weight_min_kg !== null || tier.weight_max_kg !== null) {
    const min = tier.weight_min_kg !== null ? `${tier.weight_min_kg}kg` : "—";
    const max = tier.weight_max_kg !== null ? `${tier.weight_max_kg}kg` : "—";
    parts.push(`Peso ${min} a ${max}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Sin filtros";
}

export function PriceTiersManager({
  serviceId,
  clinicSlug,
}: {
  serviceId: string;
  clinicSlug: string;
}) {
  const router = useRouter();
  const [tiers, setTiers] = useState<ServicePriceTier[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServicePriceTier | null>(null);
  const [form, setForm] = useState<TierFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ServicePriceTier | null>(
    null
  );

  async function loadTiers() {
    const r = await listServicePriceTiers(serviceId);
    if (!r.success) {
      setLoadError(r.error);
      return;
    }
    setLoadError(null);
    setTiers(r.data);
  }

  useEffect(() => {
    loadTiers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(tier: ServicePriceTier) {
    setEditing(tier);
    setForm(tierToForm(tier));
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit() {
    setFormError(null);
    startTransition(async () => {
      const input = formToInput(form);
      const r = editing
        ? await updateServicePriceTier(editing.id, serviceId, clinicSlug, input)
        : await createServicePriceTier(serviceId, clinicSlug, input);
      if (!r.success) {
        setFormError(r.error);
        return;
      }
      setDialogOpen(false);
      await loadTiers();
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    startTransition(async () => {
      const r = await deleteServicePriceTier(
        confirmDelete.id,
        serviceId,
        clinicSlug
      );
      if (!r.success) {
        setFormError(r.error);
        return;
      }
      setConfirmDelete(null);
      await loadTiers();
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Tarifas variables</CardTitle>
            <CardDescription>
              Define precios distintos según especie, talla o peso del paciente.
              Si no defines tiers, se usará el precio base del servicio.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreate} type="button">
            <Plus className="size-3.5" />
            Agregar tarifa
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loadError && (
          <p className="text-sm text-destructive">{loadError}</p>
        )}
        {!loadError && tiers === null && (
          <p className="text-sm text-muted-foreground">Cargando tarifas…</p>
        )}
        {tiers && tiers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No hay tarifas variables configuradas.
          </p>
        )}
        {tiers && tiers.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarifa</TableHead>
                <TableHead>Filtros</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((tier) => (
                <TableRow key={tier.id}>
                  <TableCell className="font-medium">{tier.label}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {describeTier(tier)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCLP(tier.price)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        tier.active
                          ? "text-xs text-green-600"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      {tier.active ? "Activa" : "Inactiva"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        type="button"
                        onClick={() => openEdit(tier)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        type="button"
                        onClick={() => setConfirmDelete(tier)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar tarifa" : "Nueva tarifa"}
            </DialogTitle>
            <DialogDescription>
              Define al menos un filtro (especie, talla o peso) para que la
              tarifa pueda calcularse automáticamente.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="tier-label">Nombre de la tarifa *</Label>
              <Input
                id="tier-label"
                placeholder="ej: Canino mediano"
                value={form.label}
                onChange={(e) =>
                  setForm((f) => ({ ...f, label: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tier-species">Especie</Label>
                <Select
                  id="tier-species"
                  value={form.species_filter}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      species_filter: e.target.value,
                    }))
                  }
                >
                  <option value="">Todas</option>
                  {SPECIES_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="tier-size">Talla</Label>
                <Select
                  id="tier-size"
                  value={form.size}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, size: e.target.value }))
                  }
                >
                  <option value="">Todas</option>
                  {SIZE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tier-wmin">Peso mínimo (kg)</Label>
                <Input
                  id="tier-wmin"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  placeholder="—"
                  value={form.weight_min_kg}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      weight_min_kg: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="tier-wmax">Peso máximo (kg)</Label>
                <Input
                  id="tier-wmax"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  placeholder="—"
                  value={form.weight_max_kg}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      weight_max_kg: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tier-price">Precio (CLP) *</Label>
              <Input
                id="tier-price"
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                placeholder="ej: 25000"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
              />
              Tarifa activa
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              {editing ? "Guardar cambios" : "Crear tarifa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar tarifa</DialogTitle>
            <DialogDescription>
              {confirmDelete && (
                <>
                  Vas a eliminar la tarifa{" "}
                  <strong>{confirmDelete.label}</strong>. Esta acción no se
                  puede deshacer.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <X className="size-3.5" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
