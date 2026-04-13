import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  CalendarDays,
  Stethoscope,
  LinkIcon,
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
import { PrescriptionList } from "@/components/clinical/prescription-list";
import { DownloadPdfButton } from "@/components/pdf/DownloadPdfButton";
import { RecordDeleteButton } from "./_components/record-delete-button";
import { getRecord } from "../actions";
import { getPrescriptions } from "./prescriptions/actions";

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ clinic: string; id: string; petId: string; recordId: string }>;
}) {
  const { clinic, id, petId, recordId } = await params;

  const result = await getRecord(recordId);

  if (!result.success) {
    notFound();
  }

  const record = result.data;

  const prescriptionsResult = await getPrescriptions(recordId);
  const hasPrescriptions =
    prescriptionsResult.success && prescriptionsResult.data.length > 0;

  const vetName = [record.vet.first_name, record.vet.last_name]
    .filter(Boolean)
    .join(" ") || "Sin asignar";

  const dateLabel = new Date(record.date + "T12:00:00").toLocaleDateString(
    "es-MX",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );

  const sections = [
    { title: "Motivo de consulta", content: record.reason },
    { title: "Anamnesis", content: record.anamnesis },
    { title: "Síntomas / Examen físico", content: record.symptoms },
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
            Registro clínico
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
                  ).toLocaleDateString("es-MX", {
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
      />

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
    </div>
  );
}
