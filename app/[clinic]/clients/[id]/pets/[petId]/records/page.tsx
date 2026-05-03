import Link from "next/link";
import { ArrowLeft, Plus, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecordCard } from "@/components/clinical/record-card";
import { SPECIES_OPTIONS } from "@/lib/validations/clients";
import { UpcomingRemindersCard } from "@/components/reminders/upcoming-reminders-card";
import { getCurrentMember, canViewClinical } from "@/lib/auth/current-member";
import { getRecords, getPetWithClient } from "./actions";

function getSpeciesLabel(species: string | null) {
  return SPECIES_OPTIONS.find((s) => s.value === species)?.label ?? species;
}

export default async function PetRecordsPage({
  params,
}: {
  params: Promise<{ clinic: string; id: string; petId: string }>;
}) {
  const { clinic, id, petId } = await params;

  const [petResult, recordsResult, member] = await Promise.all([
    getPetWithClient(petId),
    getRecords(petId),
    getCurrentMember(clinic),
  ]);
  const showReminders = !!member && canViewClinical(member);

  if (petResult.error || !petResult.data) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        Mascota no encontrada.
      </div>
    );
  }

  const pet = petResult.data;
  const records = recordsResult.success ? recordsResult.data : [];
  const clientName = `${pet.client.first_name} ${pet.client.last_name}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${clinic}/clients/${id}`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Historial de {pet.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {getSpeciesLabel(pet.species)}
            {pet.breed ? ` - ${pet.breed}` : ""}
            {" / "}
            Propietario: {clientName}
          </p>
        </div>
        <Button
          size="sm"
          render={
            <Link
              href={`/${clinic}/clients/${id}/pets/${petId}/records/new`}
            />
          }
        >
          <Plus className="size-4" data-icon="inline-start" />
          Nueva ficha
        </Button>
      </div>

      {showReminders && <UpcomingRemindersCard petId={petId} />}

      {!recordsResult.success && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {recordsResult.error}
        </div>
      )}

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <ClipboardList className="size-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No hay fichas clínicas para esta mascota.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            size="sm"
            render={
              <Link
                href={`/${clinic}/clients/${id}/pets/${petId}/records/new`}
              />
            }
          >
            <Plus className="size-4" data-icon="inline-start" />
            Crear primera ficha
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {records.length}{" "}
              {records.length === 1 ? "registro" : "registros"}
            </p>
          </div>
          {records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              href={`/${clinic}/clients/${id}/pets/${petId}/records/${record.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
