import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import {
  getAppointment,
  getVets,
  getClientsWithPets,
  getServices,
} from "../../actions";

export default async function EditAppointmentPage({
  params,
}: {
  params: Promise<{ clinic: string; id: string }>;
}) {
  const { clinic, id } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", clinic)
    .single();

  if (!org) {
    return <p className="text-sm text-muted-foreground">Organizacion no encontrada.</p>;
  }

  const [appointmentResult, clientsResult, vetsResult, servicesResult] =
    await Promise.all([
      getAppointment(id),
      getClientsWithPets(org.id),
      getVets(org.id),
      getServices(org.id),
    ]);

  if (!appointmentResult.data) {
    notFound();
  }

  const appointment = appointmentResult.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar cita</h1>
        <p className="text-sm text-muted-foreground">
          Modifica los datos de la cita de {appointment.pet.name}.
        </p>
      </div>

      <AppointmentForm
        orgId={org.id}
        clinicSlug={clinic}
        clients={clientsResult.data ?? []}
        vets={vetsResult.data ?? []}
        services={servicesResult.data ?? []}
        appointmentId={id}
        defaultValues={{
          client_id: appointment.client_id,
          pet_id: appointment.pet_id,
          vet_id: appointment.vet_id,
          service_id: appointment.service_id ?? "",
          date: appointment.date,
          start_time: appointment.start_time.slice(0, 5),
          end_time: appointment.end_time.slice(0, 5),
          reason: appointment.reason ?? "",
          notes: appointment.notes ?? "",
        }}
      />
    </div>
  );
}
