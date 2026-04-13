import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Clock,
  User,
  PawPrint,
  Stethoscope,
  FileText,
  Pencil,
  ArrowLeft,
  ClipboardList,
  Plus,
  Receipt,
  Scissors,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/appointments/status-badge";
import { StatusActions } from "@/components/appointments/status-actions";
import { getAppointment } from "../actions";
import { getLinkedRecord } from "@/app/[clinic]/clients/[id]/pets/[petId]/records/actions";
import { getLinkedGroomingRecord } from "@/app/[clinic]/clients/[id]/pets/[petId]/grooming/actions";

function formatTime(time: string): string {
  return time.slice(0, 5);
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ clinic: string; id: string }>;
}) {
  const { clinic, id } = await params;

  const { data: appointment, error } = await getAppointment(id);

  if (error || !appointment) {
    notFound();
  }

  const isGrooming = appointment.type === "grooming";
  const [linkedRecord, linkedGroomingRecord] = await Promise.all([
    isGrooming ? Promise.resolve(null) : getLinkedRecord(appointment.id),
    isGrooming ? getLinkedGroomingRecord(appointment.id) : Promise.resolve(null),
  ]);
  const professionalName =
    [appointment.professional.first_name, appointment.professional.last_name]
      .filter(Boolean)
      .join(" ") || "Sin asignar";

  const clientName = `${appointment.client.first_name} ${appointment.client.last_name}`;

  const dateObj = new Date(appointment.date + "T12:00:00");
  const dateLabel = format(dateObj, "EEEE d 'de' MMMM, yyyy", { locale: es });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${clinic}/appointments`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Cita de {appointment.pet.name}
            </h1>
            <StatusBadge status={appointment.status} />
          </div>
          <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
        </div>
        {appointment.status !== "completed" && appointment.status !== "cancelled" && (
          <Link href={`/${clinic}/appointments/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="size-3.5" />
              Editar
            </Button>
          </Link>
        )}
      </div>

      <StatusActions
        appointmentId={appointment.id}
        currentStatus={appointment.status}
        clinicSlug={clinic}
      />

      {!isGrooming && (appointment.status === "completed" || appointment.status === "in_progress") && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <ClipboardList className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Registro clínico</p>
                <p className="text-xs text-muted-foreground">
                  {linkedRecord
                    ? "Este registro está vinculado a esta cita."
                    : "Registra los hallazgos clínicos de esta consulta."}
                </p>
              </div>
            </div>
            {linkedRecord ? (
              <Link
                href={`/${clinic}/clients/${appointment.client.id}/pets/${appointment.pet.id}/records/${linkedRecord.id}`}
              >
                <Button variant="outline" size="sm">
                  <ClipboardList className="size-3.5" data-icon="inline-start" />
                  Ver registro
                </Button>
              </Link>
            ) : (
              <Link
                href={`/${clinic}/clients/${appointment.client.id}/pets/${appointment.pet.id}/records/new?appointment=${appointment.id}`}
              >
                <Button size="sm">
                  <Plus className="size-3.5" data-icon="inline-start" />
                  Crear registro
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {isGrooming &&
        (appointment.status === "in_progress" ||
          appointment.status === "ready_for_pickup" ||
          appointment.status === "completed") && (
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Scissors className="size-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Registro de peluquería</p>
                  <p className="text-xs text-muted-foreground">
                    {linkedGroomingRecord
                      ? "Este servicio ya está registrado."
                      : "Deja observaciones opcionales del servicio realizado."}
                  </p>
                </div>
              </div>
              {linkedGroomingRecord ? (
                <Link
                  href={`/${clinic}/clients/${appointment.client.id}/pets/${appointment.pet.id}/grooming/${linkedGroomingRecord.id}`}
                >
                  <Button variant="outline" size="sm">
                    <Scissors className="size-3.5" data-icon="inline-start" />
                    Ver servicio
                  </Button>
                </Link>
              ) : (
                <Link
                  href={`/${clinic}/clients/${appointment.client.id}/pets/${appointment.pet.id}/grooming/new?appointment=${appointment.id}`}
                >
                  <Button size="sm">
                    <Plus className="size-3.5" data-icon="inline-start" />
                    Registrar servicio
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

      {appointment.status === "completed" && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Receipt className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Facturación</p>
                <p className="text-xs text-muted-foreground">
                  Genera una factura a partir de esta cita.
                </p>
              </div>
            </div>
            <Link
              href={`/${clinic}/billing/new?appointment=${appointment.id}&client=${appointment.client.id}`}
            >
              <Button size="sm">
                <Receipt className="size-3.5" data-icon="inline-start" />
                Generar factura
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="size-4" />
              Horario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Fecha</span>
              <span className="text-sm font-medium capitalize">{dateLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Hora</span>
              <span className="text-sm font-medium">
                {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <PawPrint className="size-4" />
              Mascota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Nombre</span>
              <span className="text-sm font-medium">{appointment.pet.name}</span>
            </div>
            {appointment.pet.species && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Especie</span>
                <span className="text-sm font-medium">{appointment.pet.species}</span>
              </div>
            )}
            {appointment.pet.breed && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Raza</span>
                <span className="text-sm font-medium">{appointment.pet.breed}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <User className="size-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Nombre</span>
              <span className="text-sm font-medium">{clientName}</span>
            </div>
            {appointment.client.phone && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Telefono</span>
                <span className="text-sm font-medium">{appointment.client.phone}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Stethoscope className="size-4" />
              {isGrooming ? "Peluquero" : "Veterinario"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Nombre</span>
              <span className="text-sm font-medium">{professionalName}</span>
            </div>
            {appointment.professional.specialty && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Especialidad</span>
                <span className="text-sm font-medium">{appointment.professional.specialty}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {appointment.service && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="size-4" />
              Servicio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Servicio</span>
              <span className="text-sm font-medium">{appointment.service.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Duracion</span>
              <span className="text-sm font-medium">{appointment.service.duration_minutes} min</span>
            </div>
            {appointment.service.price != null && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Precio</span>
                <span className="text-sm font-medium">${appointment.service.price}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(appointment.reason || appointment.notes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Detalles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appointment.reason && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Motivo de consulta
                </p>
                <p className="text-sm">{appointment.reason}</p>
              </div>
            )}
            {appointment.reason && appointment.notes && <Separator />}
            {appointment.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Notas internas
                </p>
                <p className="text-sm">{appointment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
