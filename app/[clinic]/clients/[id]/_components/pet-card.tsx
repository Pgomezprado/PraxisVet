"use client";

import Image from "next/image";
import Link from "next/link";
import { PawPrint, Pencil, Syringe, ClipboardList, Bug, Scissors } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/clients/delete-button";
import { deletePet } from "../../actions";
import { useClinic } from "@/lib/context/clinic-context";
import {
  SPECIES_OPTIONS,
  SEX_OPTIONS,
  formatReproductiveStatus,
} from "@/lib/validations/clients";
import type { Pet } from "@/types";

interface PetCardProps {
  pet: Pet;
  clientId: string;
  clinicSlug: string;
  orgId: string;
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
  return `${y} ${y === 1 ? "año" : "años"}`;
}

export function PetCard({ pet, clientId, clinicSlug, orgId }: PetCardProps) {
  const { member } = useClinic();
  const canSeeClinical = member.role === "admin" || member.role === "vet";
  const canSeeGrooming = member.role === "admin" || member.role === "groomer";
  const age = calculateAge(pet.birthdate);
  const reproductiveLabel = formatReproductiveStatus(
    pet.reproductive_status,
    pet.sex
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {pet.photo_url ? (
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full border">
              <Image
                src={pet.photo_url}
                alt={pet.name}
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <PawPrint className="size-5 text-muted-foreground" />
            </div>
          )}
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
        {reproductiveLabel && (
          <Badge variant="outline">{reproductiveLabel}</Badge>
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
        {canSeeClinical && (
          <>
            <Button
              variant="outline"
              size="xs"
              render={<Link href={`/${clinicSlug}/clients/${clientId}/pets/${pet.id}/records`} />}
            >
              <ClipboardList className="size-3" data-icon="inline-start" />
              Historial
            </Button>
            <Button
              variant="outline"
              size="xs"
              render={<Link href={`/${clinicSlug}/clients/${clientId}/pets/${pet.id}/vaccinations`} />}
            >
              <Syringe className="size-3" data-icon="inline-start" />
              Vacunas
            </Button>
            <Button
              variant="outline"
              size="xs"
              render={
                <Link
                  href={`/${clinicSlug}/clients/${clientId}/pets/${pet.id}/dewormings`}
                />
              }
            >
              <Bug className="size-3" data-icon="inline-start" />
              Desparasitaciones
            </Button>
          </>
        )}
        {canSeeGrooming && (
          <Button
            variant="outline"
            size="xs"
            render={
              <Link
                href={`/${clinicSlug}/clients/${clientId}/pets/${pet.id}/grooming`}
              />
            }
          >
            <Scissors className="size-3" data-icon="inline-start" />
            Peluquería
          </Button>
        )}
        <Button
          variant="outline"
          size="xs"
          render={<Link href={`/${clinicSlug}/clients/${clientId}/pets/${pet.id}/edit`} />}
        >
          <Pencil className="size-3" data-icon="inline-start" />
          Editar
        </Button>
        <DeleteButton
          label="Eliminar mascota"
          description={`Se eliminará a ${pet.name} y todos sus registros asociados. Esta acción no se puede deshacer.`}
          onDelete={() => deletePet(orgId, pet.id, clientId, clinicSlug)}
        />
      </div>
    </div>
  );
}
