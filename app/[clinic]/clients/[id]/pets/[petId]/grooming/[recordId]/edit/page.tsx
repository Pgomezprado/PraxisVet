import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GroomingRecordForm } from "@/components/grooming/grooming-record-form";
import { getGroomers, getGroomingRecord } from "../../actions";
import { getCurrentMember, canViewGrooming } from "@/lib/auth/current-member";

export default async function EditGroomingRecordPage({
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

  const member = await getCurrentMember(clinic);
  if (!member || !canViewGrooming(member)) {
    notFound();
  }

  const result = await getGroomingRecord(recordId);
  if (!result.success) {
    notFound();
  }

  const record = result.data;

  if (record.org_id !== member.org_id || record.pet_id !== petId) {
    notFound();
  }

  const groomersResult = await getGroomers(member.org_id);
  const groomers = groomersResult.data ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${clinic}/clients/${id}/pets/${petId}/grooming/${recordId}`}
        >
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Editar servicio de peluquería
          </h1>
          <p className="text-sm text-muted-foreground">
            {record.pet.name}
          </p>
        </div>
      </div>

      <GroomingRecordForm
        petId={petId}
        petName={record.pet.name}
        clientId={id}
        groomers={groomers}
        record={{
          id: record.id,
          groomer_id: record.groomer_id,
          appointment_id: record.appointment_id,
          date: record.date,
          service_performed: record.service_performed,
          observations: record.observations,
          price: record.price,
        }}
      />
    </div>
  );
}
