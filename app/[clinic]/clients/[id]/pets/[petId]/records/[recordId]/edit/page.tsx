import Link from "next/link";
import { ArrowLeft, Syringe, Worm } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RecordForm } from "@/components/clinical/record-form";
import { PatientNotesBanner } from "@/components/clinical/patient-notes-banner";
import { VaccinationInlineList } from "@/components/vaccinations/vaccination-inline-list";
import { DewormingInlineList } from "@/components/dewormings/deworming-inline-list";
import { getVaccineCatalogForPet } from "@/lib/vaccines/catalog";
import type { Species } from "@/types";
import { AddVaccinationSheet } from "../_components/add-vaccination-sheet";
import { AddDewormingSheet } from "../_components/add-deworming-sheet";
import { getRecord, getVets, getPetNotes } from "../../actions";
import {
  getVaccinationsByRecord,
  getVets as getVaccinationVets,
} from "../../../vaccinations/actions";
import { getDewormingsByRecord } from "../../../dewormings/actions";

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{
    clinic: string;
    id: string;
    petId: string;
    recordId: string;
  }>;
}) {
  const { clinic, id, petId, recordId } = await params;

  const result = await getRecord(recordId);

  if (!result.success) {
    notFound();
  }

  const record = result.data;

  const speciesForCatalog = record.pet.species as Species | null;

  const [
    vetsResult,
    vaccinationsOfRecord,
    dewormingsOfRecord,
    sheetVetsResult,
    catalog,
    petNotes,
  ] = await Promise.all([
    getVets(record.org_id),
    getVaccinationsByRecord(recordId),
    getDewormingsByRecord(recordId),
    getVaccinationVets(record.org_id),
    speciesForCatalog
      ? getVaccineCatalogForPet(speciesForCatalog, record.org_id)
      : Promise.resolve([]),
    getPetNotes(petId),
  ]);

  const vets = vetsResult.data ?? [];
  const sheetVets = sheetVetsResult.success ? sheetVetsResult.data : [];
  const vaccinationsList = vaccinationsOfRecord.success
    ? vaccinationsOfRecord.data
    : [];
  const dewormingsList = dewormingsOfRecord.success
    ? dewormingsOfRecord.data
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${clinic}/clients/${id}/pets/${petId}/records/${recordId}`}
        >
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Editar ficha clínica
          </h1>
          <p className="text-sm text-muted-foreground">
            {record.pet.name} -{" "}
            {new Date(record.date + "T12:00:00").toLocaleDateString("es-CL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <PatientNotesBanner notes={petNotes} />

      <RecordForm
        petId={petId}
        clientId={id}
        vets={vets}
        record={{
          id: record.id,
          vet_id: record.vet_id,
          appointment_id: record.appointment_id,
          date: record.date,
          reason: record.reason,
          anamnesis: record.anamnesis,
          symptoms: record.symptoms,
          diagnosis: record.diagnosis,
          treatment: record.treatment,
          observations: record.observations,
          weight: record.weight,
          temperature: record.temperature,
          heart_rate: record.heart_rate,
          heart_rate_unmeasurable: record.heart_rate_unmeasurable,
          heart_auscultation_status: record.heart_auscultation_status,
          heart_auscultation_findings: record.heart_auscultation_findings,
          respiratory_rate: record.respiratory_rate,
          respiratory_auscultation_status:
            record.respiratory_auscultation_status,
          respiratory_auscultation_findings:
            record.respiratory_auscultation_findings,
          capillary_refill_seconds: record.capillary_refill_seconds,
          skin_fold_seconds: record.skin_fold_seconds,
          physical_exam: record.physical_exam,
          next_consultation_date: record.next_consultation_date,
          next_consultation_note: record.next_consultation_note,
        }}
        extraSections={
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Syringe className="size-4" />
                  Vacunas aplicadas en esta consulta
                </CardTitle>
                <AddVaccinationSheet
                  petId={petId}
                  clientId={id}
                  clinicSlug={clinic}
                  recordId={recordId}
                  recordDate={record.date}
                  recordVetId={record.vet_id}
                  vets={sheetVets}
                  catalog={catalog}
                />
              </CardHeader>
              <CardContent>
                <VaccinationInlineList vaccinations={vaccinationsList} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Worm className="size-4" />
                  Desparasitaciones aplicadas en esta consulta
                </CardTitle>
                <AddDewormingSheet
                  petId={petId}
                  clientId={id}
                  clinicSlug={clinic}
                  recordId={recordId}
                  recordDate={record.date}
                  recordVetId={record.vet_id}
                  vets={sheetVets}
                />
              </CardHeader>
              <CardContent>
                <DewormingInlineList dewormings={dewormingsList} />
              </CardContent>
            </Card>
          </div>
        }
      />
    </div>
  );
}
