import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  CalendarDays,
  CalendarPlus,
  Stethoscope,
  LinkIcon,
  Syringe,
  Worm,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { VitalsDisplay } from "@/components/clinical/vitals-display";
import { PhysicalExamDisplay } from "@/components/clinical/physical-exam-display";
import { PatientNotesBanner } from "@/components/clinical/patient-notes-banner";
import { PrescriptionList } from "@/components/clinical/prescription-list";
import { DownloadPdfButton } from "@/components/pdf/DownloadPdfButton";
import { VaccinationInlineList } from "@/components/vaccinations/vaccination-inline-list";
import { DewormingInlineList } from "@/components/dewormings/deworming-inline-list";
import { getVaccineCatalogForPet } from "@/lib/vaccines/catalog";
import type { Species } from "@/types";
import { RecordDeleteButton } from "./_components/record-delete-button";
import { AddVaccinationSheet } from "./_components/add-vaccination-sheet";
import { AddDewormingSheet } from "./_components/add-deworming-sheet";
import { getRecord, getPetNotes } from "../actions";
import { getPrescriptions } from "./prescriptions/actions";
import {
  getVaccinationsByRecord,
  getVets as getVaccinationVets,
} from "../../vaccinations/actions";
import { getDewormingsByRecord } from "../../dewormings/actions";
import { getExams } from "../../exams/actions";
import { ExamList } from "@/components/exams/exam-list";
import { RequestExamSheet } from "../../exams/_components/request-exam-sheet";
import {
  getCurrentMember,
  canViewExams,
} from "@/lib/auth/current-member";

export default async function RecordDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string; id: string; petId: string; recordId: string }>;
  searchParams: Promise<{ open?: string; created?: string }>;
}) {
  const { clinic, id, petId, recordId } = await params;
  const { open: openParam, created: createdParam } = await searchParams;
  const justCreated = createdParam === "1";

  const result = await getRecord(recordId);

  if (!result.success) {
    notFound();
  }

  const record = result.data;

  const speciesForCatalog = record.pet.species as Species | null;

  const [
    prescriptionsResult,
    vaccinationsOfRecord,
    dewormingsOfRecord,
    vetsResult,
    catalog,
    petNotes,
    member,
    examsResult,
  ] = await Promise.all([
    getPrescriptions(recordId),
    getVaccinationsByRecord(recordId),
    getDewormingsByRecord(recordId),
    getVaccinationVets(record.org_id),
    speciesForCatalog
      ? getVaccineCatalogForPet(speciesForCatalog, record.org_id)
      : Promise.resolve([]),
    getPetNotes(petId),
    getCurrentMember(clinic),
    getExams(petId),
  ]);

  const showExams = !!member && canViewExams(member.role);
  const recordExams =
    showExams && examsResult.success
      ? examsResult.data.filter((e) => e.clinical_record_id === recordId)
      : [];

  const hasPrescriptions =
    prescriptionsResult.success && prescriptionsResult.data.length > 0;

  const vetsForSheets = vetsResult.success ? vetsResult.data : [];
  const vaccinationsList = vaccinationsOfRecord.success
    ? vaccinationsOfRecord.data
    : [];
  const dewormingsList = dewormingsOfRecord.success
    ? dewormingsOfRecord.data
    : [];

  const vetName = [record.vet.first_name, record.vet.last_name]
    .filter(Boolean)
    .join(" ") || "Sin asignar";

  const dateLabel = new Date(record.date + "T12:00:00").toLocaleDateString(
    "es-CL",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );

  const sections = [
    { title: "Motivo de consulta", content: record.reason },
    { title: "Anamnesis", content: record.anamnesis },
    { title: "Signos observados", content: record.symptoms },
    { title: "Diagnóstico", content: record.diagnosis },
    { title: "Tratamiento", content: record.treatment },
    { title: "Observaciones", content: record.observations },
  ].filter((s) => s.content);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${clinic}/clients/${id}/pets/${petId}/records`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Ficha clínica
          </h1>
          <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
        </div>
        <div className="flex gap-2">
          {hasPrescriptions && (
            <DownloadPdfButton
              href={`/api/${clinic}/prescriptions/${recordId}/pdf`}
              fileName={`receta-${recordId}.pdf`}
              label="Descargar receta"
            />
          )}
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                href={`/${clinic}/clients/${id}/pets/${petId}/records/${recordId}/edit`}
              />
            }
          >
            <Pencil className="size-3.5" data-icon="inline-start" />
            Editar
          </Button>
          <RecordDeleteButton
            recordId={recordId}
            clinicSlug={clinic}
            clientId={id}
            petId={petId}
          />
        </div>
      </div>

      <PatientNotesBanner notes={petNotes} />

      {justCreated && (
        <div className="flex items-start gap-3 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm">
          <div className="size-2 rounded-full bg-primary mt-2 shrink-0" />
          <div>
            <p className="font-medium">Ficha creada</p>
            <p className="text-muted-foreground">
              {openParam === "vaccine"
                ? "Ahora registra la vacuna aplicada más abajo."
                : openParam === "deworming"
                  ? "Ahora registra la desparasitación aplicada más abajo."
                  : "Revisa la información y edítala si necesitas."}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <CalendarDays className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Fecha</p>
              <p className="text-sm font-medium capitalize">{dateLabel}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Stethoscope className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Veterinario</p>
              <p className="text-sm font-medium">
                {vetName}
                {record.vet.specialty && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({record.vet.specialty})
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {record.appointment && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <LinkIcon className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Vinculado a cita
                </p>
                <p className="text-sm font-medium">
                  {new Date(
                    record.appointment.date + "T12:00:00"
                  ).toLocaleDateString("es-CL", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  - {record.appointment.start_time.slice(0, 5)}
                </p>
              </div>
            </div>
            <Link href={`/${clinic}/appointments/${record.appointment.id}`}>
              <Button variant="outline" size="sm">
                Ver cita
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <VitalsDisplay
        weight={record.weight}
        temperature={record.temperature}
        heartRate={record.heart_rate}
        heartRateUnmeasurable={record.heart_rate_unmeasurable}
        heartAuscultationStatus={record.heart_auscultation_status}
        heartAuscultationFindings={record.heart_auscultation_findings}
      />

      <PhysicalExamDisplay
        respiratoryRate={record.respiratory_rate}
        respiratoryAuscultationStatus={record.respiratory_auscultation_status}
        respiratoryAuscultationFindings={
          record.respiratory_auscultation_findings
        }
        capillaryRefill={record.capillary_refill_seconds}
        skinFold={record.skin_fold_seconds}
        physicalExam={record.physical_exam}
      />

      {record.next_consultation_date && (
        <Card>
          <CardContent className="py-4 flex items-center gap-3">
            <CalendarPlus className="size-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Próxima consulta</p>
              <p className="text-sm font-medium">
                {new Date(
                  record.next_consultation_date + "T12:00:00"
                ).toLocaleDateString("es-CL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {record.next_consultation_note && (
                  <span className="text-muted-foreground font-normal">
                    {" — "}
                    {record.next_consultation_note}
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {sections.length > 0 && (
        <Card>
          <CardContent className="py-6 space-y-5">
            {sections.map((section, i) => (
              <div key={section.title}>
                {i > 0 && <Separator className="mb-5" />}
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-1.5">
                    {section.title}
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">
                    {section.content}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <PrescriptionList
        recordId={recordId}
        orgId={record.org_id}
        clinicSlug={clinic}
      />

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
            vets={vetsForSheets}
            catalog={catalog}
            defaultOpen={openParam === "vaccine"}
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
            vets={vetsForSheets}
            defaultOpen={openParam === "deworming"}
          />
        </CardHeader>
        <CardContent>
          <DewormingInlineList dewormings={dewormingsList} />
        </CardContent>
      </Card>

      {showExams && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="size-4" />
              Exámenes de esta consulta
            </CardTitle>
            <RequestExamSheet
              orgId={record.org_id}
              petId={petId}
              clientId={id}
              clinicSlug={clinic}
              clinicalRecordId={recordId}
              triggerVariant="outline"
            />
          </CardHeader>
          <CardContent>
            {recordExams.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Sin exámenes solicitados en esta consulta.
              </p>
            ) : (
              <ExamList exams={recordExams} compact canInterpret={false} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
