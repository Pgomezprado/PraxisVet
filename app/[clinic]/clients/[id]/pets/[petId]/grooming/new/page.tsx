import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GroomingRecordForm } from "@/components/grooming/grooming-record-form";
import { LastGroomingSummary } from "@/components/grooming/last-grooming-summary";
import { getGroomers, getGroomingRecords, getGroomingServiceNames } from "../actions";
import { getPetWithClient } from "../../records/actions";
import { getAppointment } from "@/app/[clinic]/appointments/actions";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentMember,
  canCreateGroomingHistorical,
  canViewGrooming,
} from "@/lib/auth/current-member";

export default async function NewGroomingRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string; id: string; petId: string }>;
  searchParams: Promise<{ appointment?: string }>;
}) {
  const { clinic, id, petId } = await params;
  const { appointment: appointmentId } = await searchParams;

  const member = await getCurrentMember(clinic);
  if (!member || !canCreateGroomingHistorical(member)) {
    notFound();
  }
  // El recepcionista solo puede crear el registro; no ve el listado ni el
  // detalle. Tras guardar lo regresamos a la ficha del cliente.
  const isHistoricalOnly = !canViewGrooming(member);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        No autenticado.
      </div>
    );
  }

  const petResult = await getPetWithClient(petId);

  if (petResult.error || !petResult.data) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        Mascota no encontrada.
      </div>
    );
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", clinic)
    .single();

  if (!org) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        Organización no encontrada.
      </div>
    );
  }

  const [groomersResult, serviceOptions, previousRecordsResult] =
    await Promise.all([
      getGroomers(org.id),
      getGroomingServiceNames(org.id),
      getGroomingRecords(petId),
    ]);
  const groomers = groomersResult.data ?? [];
  const previousRecords = previousRecordsResult.success
    ? previousRecordsResult.data
    : [];

  let defaultGroomerId: string | undefined;
  let defaultAppointmentId: string | undefined;

  if (appointmentId) {
    const appointmentResult = await getAppointment(appointmentId);
    if (appointmentResult.data) {
      defaultAppointmentId = appointmentResult.data.id;
      if (appointmentResult.data.type === "grooming") {
        defaultGroomerId = appointmentResult.data.assigned_to;
      }
    }
  }

  if (!defaultGroomerId) {
    const { data: currentMember } = await supabase
      .from("organization_members")
      .select("id, role")
      .eq("user_id", user.id)
      .eq("org_id", org.id)
      .single();

    if (
      currentMember &&
      (currentMember.role === "groomer" || currentMember.role === "admin")
    ) {
      defaultGroomerId = currentMember.id;
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={
            defaultAppointmentId
              ? `/${clinic}/appointments/${defaultAppointmentId}`
              : isHistoricalOnly
                ? `/${clinic}/clients/${id}`
                : `/${clinic}/clients/${id}/pets/${petId}/grooming`
          }
        >
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isHistoricalOnly
              ? "Registrar peluquería histórica"
              : "Nuevo servicio de peluquería"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {petResult.data.name} · {petResult.data.client.first_name}{" "}
            {petResult.data.client.last_name}
          </p>
        </div>
      </div>

      {isHistoricalOnly && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
          Estás registrando una sesión histórica para mantener el historial de la mascota. Una vez guardada, solo el peluquero o admin podrá verla y editarla.
        </div>
      )}

      {petResult.data.is_dangerous && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
          <div className="space-y-0.5">
            <p className="font-medium">Animal peligroso o agresivo</p>
            <p className="text-xs text-red-800/90 dark:text-red-300/80">
              Esta mascota está marcada por la clínica. Considera bozal,
              sedación previa o apoyo de otra persona antes de empezar.
            </p>
          </div>
        </div>
      )}

      {!isHistoricalOnly && (
        <LastGroomingSummary
          petName={petResult.data.name}
          records={previousRecords}
        />
      )}

      <GroomingRecordForm
        petId={petId}
        petName={petResult.data.name}
        clientId={id}
        groomers={groomers}
        serviceOptions={serviceOptions}
        defaultAppointmentId={defaultAppointmentId}
        defaultGroomerId={defaultGroomerId}
        successRedirect={
          isHistoricalOnly
            ? `/${clinic}/clients/${id}`
            : undefined
        }
      />
    </div>
  );
}
