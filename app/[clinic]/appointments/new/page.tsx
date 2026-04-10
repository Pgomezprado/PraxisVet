import { createClient } from "@/lib/supabase/server";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { getVets, getClientsWithPets, getServices } from "../actions";

export default async function NewAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { clinic } = await params;
  const { date: dateParam } = await searchParams;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", clinic)
    .single();

  if (!org) {
    return <p className="text-sm text-muted-foreground">Organizacion no encontrada.</p>;
  }

  const [clientsResult, vetsResult, servicesResult] = await Promise.all([
    getClientsWithPets(org.id),
    getVets(org.id),
    getServices(org.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nueva cita</h1>
        <p className="text-sm text-muted-foreground">
          Completa los datos para agendar una nueva cita.
        </p>
      </div>

      <AppointmentForm
        orgId={org.id}
        clinicSlug={clinic}
        clients={clientsResult.data ?? []}
        vets={vetsResult.data ?? []}
        services={servicesResult.data ?? []}
        defaultValues={dateParam ? { date: dateParam } : undefined}
      />
    </div>
  );
}
