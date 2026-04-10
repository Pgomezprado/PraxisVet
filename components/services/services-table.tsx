"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  categoryLabels,
  categoryColors,
} from "@/components/services/category-labels";
import {
  deleteService,
  toggleServiceActive,
} from "@/app/[clinic]/settings/services/actions";
import type { Service, ServiceCategory } from "@/types";

interface ServicesTableProps {
  services: Service[];
  clinicSlug: string;
}

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "--";
  return `$${Number(price).toFixed(2)}`;
}

export function ServicesTable({ services, clinicSlug }: ServicesTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = services.filter((service) => {
    const term = search.toLowerCase();
    return (
      service.name.toLowerCase().includes(term) ||
      (service.description?.toLowerCase().includes(term) ?? false) ||
      (service.category &&
        categoryLabels[service.category as ServiceCategory]
          ?.toLowerCase()
          .includes(term))
    );
  });

  async function handleToggle(service: Service) {
    setLoadingId(service.id);
    await toggleServiceActive(service.id, service.active, clinicSlug);
    setLoadingId(null);
    router.refresh();
  }

  async function handleDelete(serviceId: string) {
    if (!confirm("Estas seguro de eliminar este servicio?")) return;
    setLoadingId(serviceId);
    const result = await deleteService(serviceId, clinicSlug);
    setLoadingId(null);
    if (!result.success) {
      alert(result.error);
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o categor\u00eda..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          render={
            <Link href={`/${clinicSlug}/settings/services/new`} />
          }
        >
          <Plus className="size-4" data-icon="inline-start" />
          Nuevo servicio
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-sm text-muted-foreground">
            {search
              ? "No se encontraron servicios con esa b\u00fasqueda."
              : "A\u00fan no hay servicios registrados."}
          </p>
          {!search && (
            <Button
              variant="outline"
              className="mt-4"
              render={
                <Link href={`/${clinicSlug}/settings/services/new`} />
              }
            >
              <Plus className="size-4" data-icon="inline-start" />
              Crear primer servicio
            </Button>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Categor\u00eda</TableHead>
              <TableHead>Duraci\u00f3n</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((service) => (
              <TableRow
                key={service.id}
                className={service.active ? "" : "opacity-50"}
              >
                <TableCell className="font-medium">{service.name}</TableCell>
                <TableCell>
                  {service.category ? (
                    <Badge
                      variant="secondary"
                      className={
                        categoryColors[service.category as ServiceCategory] ?? ""
                      }
                    >
                      {categoryLabels[service.category as ServiceCategory] ??
                        service.category}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </TableCell>
                <TableCell>{service.duration_minutes} min</TableCell>
                <TableCell>{formatPrice(service.price)}</TableCell>
                <TableCell>
                  <Badge
                    variant={service.active ? "default" : "secondary"}
                  >
                    {service.active ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={
                        <Link
                          href={`/${clinicSlug}/settings/services/${service.id}/edit`}
                        />
                      }
                    >
                      <Pencil className="size-4" />
                      <span className="sr-only">Editar</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={loadingId === service.id}
                      onClick={() => handleToggle(service)}
                    >
                      {service.active ? (
                        <ToggleRight className="size-4" />
                      ) : (
                        <ToggleLeft className="size-4" />
                      )}
                      <span className="sr-only">
                        {service.active ? "Desactivar" : "Activar"}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={loadingId === service.id}
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
