import Link from "next/link";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getCurrentMember,
  canViewExams,
  canInterpretExam,
} from "@/lib/auth/current-member";
import { SPECIES_OPTIONS } from "@/lib/validations/clients";
import { getPetWithClient } from "../records/actions";
import { getExams } from "./actions";
import { RequestExamSheet } from "./_components/request-exam-sheet";
import { ExamsPageClient } from "./_components/exams-page-client";

function getSpeciesLabel(species: string | null) {
  return SPECIES_OPTIONS.find((s) => s.value === species)?.label ?? species;
}

export default async function PetExamsPage({
  params,
}: {
  params: Promise<{ clinic: string; id: string; petId: string }>;
}) {
  const { clinic, id, petId } = await params;

  const [petResult, examsResult, member] = await Promise.all([
    getPetWithClient(petId),
    getExams(petId),
    getCurrentMember(clinic),
  ]);

  if (petResult.error || !petResult.data) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        Mascota no encontrada.
      </div>
    );
  }

  if (!member || !canViewExams(member.role)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-md border border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          No tienes acceso a la sección de exámenes.
        </div>
      </div>
    );
  }

  const pet = petResult.data;
  const exams = examsResult.success ? examsResult.data : [];
  const clientName = `${pet.client.first_name} ${pet.client.last_name}`;
  const canInterpret = canInterpretExam(member.role);
  const canDelete = member.role === "admin";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${clinic}/clients/${id}`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FlaskConical className="size-6 text-primary" />
            Exámenes de {pet.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {getSpeciesLabel(pet.species)}
            {pet.breed ? ` - ${pet.breed}` : ""}
            {" / "}
            Propietario: {clientName}
          </p>
        </div>
        <RequestExamSheet
          orgId={member.org_id}
          petId={petId}
          clientId={id}
          clinicSlug={clinic}
        />
      </div>

      {!examsResult.success && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {examsResult.error}
        </div>
      )}

      <ExamsPageClient
        exams={exams}
        orgId={member.org_id}
        petId={petId}
        clientId={id}
        clinicSlug={clinic}
        canInterpret={canInterpret}
        canDelete={canDelete}
      />
    </div>
  );
}
