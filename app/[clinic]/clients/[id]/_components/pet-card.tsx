"use client";

import { PawPrint, Pencil, Syringe, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/clients/delete-button";
import { deletePet } from "../../actions";
import { SPECIES_OPTIONS, SEX_OPTIONS } from "@/lib/validations/clients";
import type { Pet } from "@/types";

interface PetCardProps {
  pet: Pet;
  clientId: string;
  clinicSlug: string;
}

function getSpeciesLabel(species: string | null) {
  return SPECIES_OPTIONS.find((s) => s.value === species)?.label ?? species;
}

function getSexLabel(sex: string | null) {
  return SEX_OPTIONS.find((s) => s.value === sex)?.label ?? sex;
}

function calculateAge(birthdate: string | null): string | null {
  if (!birthdate) return null;
  const birth = new Date(birthdate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const totalMonths = years * 12 + months;

  if (totalMonths < 1) return "Menos de 1 mes";
  if (totalMonths < 12) return `${totalMonths} ${totalMonths === 1 ? "mes" : "meses"}`;
  const y = Math.floor(totalMonths / 12);
  return `${y} ${y === 1 ? "anio" : "anios"}`;
}

export function PetCard({ pet, clientId, clinicSlug }: PetCardProps) {
  const age = calculateAge(pet.birthdate);

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-muted">
            <PawPrint className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{pet.name}</p>
            {pet.species && (
              <p className="text-xs text-muted-foreground">
                {getSpeciesLabel(pet.species)}
                {pet.breed ? ` - ${pet.breed}` : ""}
              </p>
            )}
          </div>
        </div>
        {!pet.active && <Badge variant="destructive">Inactivo</Badge>}
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        {pet.sex && (
          <Badge variant="outline">{getSexLabel(pet.sex)}</Badge>
        )}
        {age && <Badge variant="outline">{age}</Badge>}
        {pet.color && <Badge variant="outline">{pet.color}</Badge>}
      </div>

      {pet.microchip && (
        <p className="text-xs text-muted-foreground">
          Microchip: {pet.microchip}
        </p>
      )}

      {pet.notes && (
        <p className="text-xs text-muted-foreground">{pet.notes}</p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          variant="outline"
          size="xs"
          onClick={() => {
            window.location.href = `/${clinicSlug}/clients/${clientId}/pets/${pet.id}/records`;
          }}
        >
          <ClipboardList className="size-3" data-icon="inline-start" />
          Historial
        </Button>
        <Button
          variant="outline"
          size="xs"
          onClick={() => {
            window.location.href = `/${clinicSlug}/clients/${clientId}/pets/${pet.id}/vaccinations`;
          }}
        >
          <Syringe className="size-3" data-icon="inline-start" />
          Vacunas
        </Button>
        <Button
          variant="outline"
          size="xs"
          onClick={() => {
            window.location.href = `/${clinicSlug}/clients/${clientId}/pets/${pet.id}/edit`;
          }}
        >
          <Pencil className="size-3" data-icon="inline-start" />
          Editar
        </Button>
        <DeleteButton
          label="Eliminar mascota"
          description={`Se eliminara a ${pet.name} y todos sus registros asociados. Esta accion no se puede deshacer.`}
          onDelete={() => deletePet(pet.id, clientId, clinicSlug)}
        />
      </div>
    </div>
  );
}
