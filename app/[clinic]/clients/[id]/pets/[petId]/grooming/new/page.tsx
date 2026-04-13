import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GroomingRecordForm } from "@/components/grooming/grooming-record-form";
import { getGroomers } from "../actions";
import { getPetWithClient } from "../../records/actions";
import { getAppointment } from "@/app/[clinic]/appointments/actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewGroomingRecordPage({
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
        Organización no encontrada.
      </div>
    );
  }

  const groomersResult = await getGroomers(org.id);
  const groomers = groomersResult.data ?? [];

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
        <Link href={`/${clinic}/clients/${id}/pets/${petId}`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Nuevo servicio de peluquería
          </h1>
          <p className="text-sm text-muted-foreground">
            {petResult.data.name} · {petResult.data.client.first_name}{" "}
            {petResult.data.client.last_name}
          </p>
        </div>
      </div>

      <GroomingRecordForm
        petId={petId}
        petName={petResult.data.name}
        clientId={id}
        groomers={groomers}
        defaultAppointmentId={defaultAppointmentId}
        defaultGroomerId={defaultGroomerId}
      />
    </div>
  );
}
