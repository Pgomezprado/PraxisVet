"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, PawPrint } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SPECIES_OPTIONS, formatSpecies } from "@/lib/validations/clients";
import {
  createCustomBreed,
  deleteCustomBreed,
} from "@/app/[clinic]/settings/breeds/actions";
import type { CustomBreed, Species } from "@/types";

interface BreedsManagerProps {
  orgId: string;
  clinicSlug: string;
  initialBreeds: CustomBreed[];
}

export function BreedsManager({
  orgId,
  clinicSlug,
  initialBreeds,
}: BreedsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [species, setSpecies] = useState<Species | "">("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!species) {
      setError("Selecciona una especie");
      return;
    }
    if (!name.trim()) {
      setError("Escribe el nombre de la raza");
      return;
    }

    startTransition(async () => {
      const result = await createCustomBreed(orgId, clinicSlug, {
        species,
        name: name.trim(),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setName("");
      router.refresh();
    });
  }

  async function handleDelete(breed: CustomBreed) {
    if (
      !confirm(
        `¿Eliminar la raza "${breed.name}"? Las mascotas que ya tienen esta raza no se modifican.`
      )
    ) {
      return;
    }
    setDeletingId(breed.id);
    const result = await deleteCustomBreed(breed.id, clinicSlug);
    setDeletingId(null);
    if (!result.success) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  const grouped = SPECIES_OPTIONS.map((opt) => ({
    species: opt.value as Species,
    label: opt.label,
    items: initialBreeds.filter((b) => b.species === opt.value),
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <PawPrint className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Agregar raza
              </CardTitle>
              <CardDescription>
                La raza aparecerá como sugerencia al registrar una mascota de
                esa especie.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleAdd}
            className="grid gap-4 sm:grid-cols-[200px_1fr_auto] sm:items-end"
          >
            <div>
              <Label htmlFor="species">Especie</Label>
              <Select
                id="species"
                value={species}
                onChange={(e) => setSpecies(e.target.value as Species | "")}
                disabled={isPending}
              >
                <option value="">Seleccionar</option>
                {SPECIES_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="breed-name">Nombre de la raza</Label>
              <Input
                id="breed-name"
                placeholder="ej: Quiltro chileno"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                maxLength={80}
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" data-icon="inline-start" />
              )}
              Agregar
            </Button>
          </form>
          {error && (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {grouped.map((group) => (
        <Card key={group.species}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">
                {group.label}
              </CardTitle>
              <Badge variant="secondary">{group.items.length}</Badge>
            </div>
            <CardDescription>
              Razas personalizadas para {group.label.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {group.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no agregaste razas para {formatSpecies(group.species)}.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map((breed) => (
                    <TableRow key={breed.id}>
                      <TableCell className="font-medium">
                        {breed.name}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === breed.id}
                          onClick={() => handleDelete(breed)}
                        >
                          {deletingId === breed.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4 text-destructive" />
                          )}
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
