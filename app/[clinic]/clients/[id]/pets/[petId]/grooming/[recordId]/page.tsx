import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Scissors, User, PawPrint, FileText, Pencil } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getCurrentMember, canViewGrooming } from "@/lib/auth/current-member";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getGroomingRecord } from "../actions";

export default async function GroomingRecordDetailPage({
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
  if (!member || !canViewGrooming(member.role)) {
    notFound();
  }

  const result = await getGroomingRecord(recordId);

  if (!result.success) {
    notFound();
  }

  const record = result.data;
  const groomerName =
    [record.groomer?.first_name, record.groomer?.last_name]
      .filter(Boolean)
      .join(" ") || "Sin asignar";

  const dateLabel = format(new Date(record.date + "T12:00:00"), "EEEE d 'de' MMMM, yyyy", {
    locale: es,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${clinic}/clients/${id}/pets/${petId}/grooming`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Servicio de peluquería
          </h1>
          <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
        </div>
        <Link
          href={`/${clinic}/clients/${id}/pets/${petId}/grooming/${recordId}/edit`}
        >
          <Button variant="outline" size="sm">
            <Pencil className="size-3.5" />
            Editar
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Scissors className="size-4 text-primary" />
              Servicio realizado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-medium">
              {record.service_performed ?? "Sin especificar"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <User className="size-4 text-muted-foreground" />
              Peluquero
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-medium">{groomerName}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <PawPrint className="size-4 text-muted-foreground" />
              Mascota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-base font-medium">{record.pet.name}</p>
            {record.pet.breed && (
              <p className="text-xs text-muted-foreground">{record.pet.breed}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="size-4 text-muted-foreground" />
              Fecha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-medium capitalize">{dateLabel}</p>
          </CardContent>
        </Card>
      </div>

      {record.observations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="size-4 text-muted-foreground" />
              Observaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {record.observations}
            </p>
          </CardContent>
        </Card>
      )}

      {record.appointment && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-medium">Vinculado a una cita</p>
              <p className="text-xs text-muted-foreground">
                Este servicio fue realizado durante una cita agendada.
              </p>
            </div>
            <Link href={`/${clinic}/appointments/${record.appointment.id}`}>
              <Button variant="outline" size="sm">
                Ver cita
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
