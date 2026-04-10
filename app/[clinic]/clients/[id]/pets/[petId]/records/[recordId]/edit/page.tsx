import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RecordForm } from "@/components/clinical/record-form";
import { getRecord, getVets } from "../../actions";

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

  const vetsResult = await getVets(record.org_id);
  const vets = vetsResult.data ?? [];

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
            Editar registro clinico
          </h1>
          <p className="text-sm text-muted-foreground">
            {record.pet.name} -{" "}
            {new Date(record.date + "T12:00:00").toLocaleDateString("es-MX", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

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
        }}
      />
    </div>
  );
}
