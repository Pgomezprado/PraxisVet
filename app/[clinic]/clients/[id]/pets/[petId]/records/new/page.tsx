import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordForm } from "@/components/clinical/record-form";
import { PatientNotesBanner } from "@/components/clinical/patient-notes-banner";
import { PatientContextCard } from "@/components/clinical/patient-context-card";
import { DuplicateRecordAlert } from "@/components/clinical/duplicate-record-alert";
import {
  getVets,
  getPetWithClient,
  getPatientContext,
  getTodayRecord,
} from "../actions";
import { getAppointment } from "@/app/[clinic]/appointments/actions";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentMember,
  canViewExams,
} from "@/lib/auth/current-member";

export default async function NewRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string; id: string; petId: string }>;
  searchParams: Promise<{ appointment?: string }>;
}) {
  const { clinic, id, petId } = await params;
  const { appointment: appointmentId } = await searchParams;

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
        Organizacion no encontrada.
      </div>
    );
  }

  const [vetsResult, patientContext, todayRecord, currentMember] =
    await Promise.all([
      getVets(org.id),
      getPatientContext(petId),
      getTodayRecord(petId),
      getCurrentMember(clinic),
    ]);
  const vets = vetsResult.data ?? [];
  const canRequestExams = !!currentMember && canViewExams(currentMember.role);

  let defaultVetId: string | undefined;
  let defaultAppointmentId: string | undefined;
  let defaultReason: string | undefined;

  if (appointmentId) {
    const appointmentResult = await getAppointment(appointmentId);
    if (appointmentResult.data) {
      defaultAppointmentId = appointmentResult.data.id;
      defaultVetId = appointmentResult.data.assigned_to;
      const appt = appointmentResult.data as unknown as {
        service?: { name?: string | null } | null;
        notes?: string | null;
      };
      defaultReason =
        appt.notes?.trim() || appt.service?.name?.trim() || undefined;
    }
  }

  if (!defaultVetId) {
    const { data: currentMember } = await supabase
      .from("organization_members")
      .select("id, role")
      .eq("user_id", user.id)
      .eq("org_id", org.id)
      .single();

    if (
      currentMember &&
      (currentMember.role === "vet" || currentMember.role === "admin")
    ) {
      defaultVetId = currentMember.id;
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={
            defaultAppointmentId
              ? `/${clinic}/appointments/${defaultAppointmentId}`
              : `/${clinic}/clients/${id}/pets/${petId}/records`
          }
        >
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Nueva ficha clínica
          </h1>
          <p className="text-sm text-muted-foreground">
            {petResult.data.name} - {petResult.data.client.first_name}{" "}
            {petResult.data.client.last_name}
          </p>
        </div>
      </div>

      {todayRecord && (
        <DuplicateRecordAlert
          existingRecordHref={`/${clinic}/clients/${id}/pets/${petId}/records/${todayRecord.id}`}
        />
      )}

      <PatientNotesBanner notes={petResult.data.notes} />

      <PatientContextCard
        context={patientContext}
        clinicSlug={clinic}
        clientId={id}
        petId={petId}
      />

      <RecordForm
        petId={petId}
        clientId={id}
        vets={vets}
        defaultAppointmentId={defaultAppointmentId}
        defaultVetId={defaultVetId}
        defaultReason={defaultReason}
        orgId={org.id}
        canRequestExams={canRequestExams}
      />
    </div>
  );
}
