import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordForm } from "@/components/clinical/record-form";
import { getVets, getPetWithClient } from "../actions";
import { getAppointment } from "@/app/[clinic]/appointments/actions";
import { createClient } from "@/lib/supabase/server";

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

  const vetsResult = await getVets(org.id);
  const vets = vetsResult.data ?? [];

  let defaultVetId: string | undefined;
  let defaultAppointmentId: string | undefined;

  if (appointmentId) {
    const appointmentResult = await getAppointment(appointmentId);
    if (appointmentResult.data) {
      defaultAppointmentId = appointmentResult.data.id;
      defaultVetId = appointmentResult.data.vet_id;
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
        <Link href={`/${clinic}/clients/${id}/pets/${petId}/records`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Nuevo registro clinico
          </h1>
          <p className="text-sm text-muted-foreground">
            {petResult.data.name} - {petResult.data.client.first_name}{" "}
            {petResult.data.client.last_name}
          </p>
        </div>
      </div>

      <RecordForm
        petId={petId}
        clientId={id}
        vets={vets}
        defaultAppointmentId={defaultAppointmentId}
        defaultVetId={defaultVetId}
      />
    </div>
  );
}
