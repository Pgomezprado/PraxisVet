import { CalendarDays, PawPrint, Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RequestAppointmentButton } from "./_components/request-appointment-button";
import { VaccineReminderBanner } from "./_components/vaccine-reminder-banner";
import type { VaccineAlert } from "./_components/vaccine-reminder-banner";
import { PetHeroSingle } from "./_components/pet-hero-single";
import { PetHeroGrid } from "./_components/pet-hero-grid";
import {
  getTutorPets,
  getTutorUpcomingAppointments,
} from "./queries";

export const dynamic = "force-dynamic";

// Reutilizamos la lógica de classifyHealthItem pero acá la inlinamos en el server
// para no importar desde una ruta cliente (/c/[token]).
function daysUntil(nextDueDate: string): number {
  const due = new Date(nextDueDate + "T12:00:00");
  const now = new Date();
  return Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default async function TutorHomePage({
  params,
}: {
  params: Promise<{ clinic: string }>;
}) {
  const { clinic } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // El layout ya redirigió si no hay user, pero TS no lo sabe.
  const tutorId = user?.id ?? "";

  // Resolvemos nombre del tutor para el saludo (el layout lo tiene pero no lo
  // expone vía props — preferimos query corta a state global).
  const { data: link } = await supabase
    .from("client_auth_links")
    .select(`clients ( first_name )`)
    .eq("user_id", tutorId)
    .eq("active", true)
    .not("linked_at", "is", null)
    .maybeSingle();
  const firstName =
    ((link?.clients as unknown) as { first_name: string } | null)
      ?.first_name?.split(" ")[0] ?? null;

  const [pets, upcoming] = await Promise.all([
    getTutorPets(supabase),
    getTutorUpcomingAppointments(supabase),
  ]);

  // Calcular alertas de vacunas (vencidas + por vencer en 30 días).
  const alerts: VaccineAlert[] = [];
  if (pets.length > 0) {
    const petIds = pets.map((p) => p.id);
    const { data: vaccs } = await supabase
      .from("vaccinations")
      .select("id, pet_id, vaccine_name, next_due_date")
      .in("pet_id", petIds)
      .not("next_due_date", "is", null)
      .order("next_due_date", { ascending: true });

    // Una alerta por mascota — la vacuna más urgente.
    const seen = new Set<string>();
    for (const v of vaccs ?? []) {
      if (!v.next_due_date || seen.has(v.pet_id)) continue;
      const d = daysUntil(v.next_due_date);
      const status: VaccineAlert["status"] | null =
        d < 0 ? "vencida" : d <= 30 ? "por_vencer" : null;
      if (!status) continue;
      const pet = pets.find((p) => p.id === v.pet_id);
      if (!pet) continue;
      seen.add(v.pet_id);
      alerts.push({
        petId: pet.id,
        petName: pet.name,
        vaccineName: v.vaccine_name,
        status,
        daysFromNow: d,
      });
    }
    // Vencidas primero (más urgentes), luego por vencer.
    alerts.sort((a, b) => {
      if (a.status !== b.status) return a.status === "vencida" ? -1 : 1;
      return a.daysFromNow - b.daysFromNow;
    });
  }

  const alertPetIds = new Set(alerts.map((a) => a.petId));

  return (
    <div className="space-y-6">
      {/* Saludo compacto en una línea — no domina la pantalla */}
      <p className="text-base font-medium text-muted-foreground">
        {firstName ? `${greeting()}, ${firstName}` : greeting()}
      </p>

      {/* Banner de vacunas — siempre antes del hero cuando aplica */}
      {alerts.length > 0 && tutorId && (
        <VaccineReminderBanner
          clinicSlug={clinic}
          tutorId={tutorId}
          alerts={alerts}
        />
      )}

      {/* Hero — el elemento más prominente */}
      {pets.length === 0 ? (
        <EmptyPetsState />
      ) : pets.length === 1 ? (
        <PetHeroSingle clinicSlug={clinic} pet={pets[0]} />
      ) : (
        <PetHeroGrid
          clinicSlug={clinic}
          pets={pets}
          alertPetIds={alertPetIds}
        />
      )}

      {/* Próximas citas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-4" />
            Próximas citas
            <Badge variant="secondary">{upcoming.length}</Badge>
          </CardTitle>
          <CardDescription>
            Citas confirmadas o pendientes de confirmación por la clínica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-8 text-center sm:flex-row sm:gap-4">
              <p className="text-sm text-muted-foreground">
                Aún no tienes horas reservadas.
              </p>
              {pets.length > 0 && (
                <RequestAppointmentButton
                  clinicSlug={clinic}
                  pets={pets}
                  variant="outline"
                />
              )}
            </div>
          ) : (
            <ul className="divide-y">
              {upcoming.map((appt) => (
                <li
                  key={appt.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      {appt.type === "grooming" ? (
                        <PawPrint className="size-4 text-primary" />
                      ) : (
                        <Stethoscope className="size-4 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {appt.pet?.name ?? "Mascota"} ·{" "}
                        {appt.service?.name ??
                          (appt.type === "grooming"
                            ? "Peluquería"
                            : "Consulta")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateLong(appt.date)} · {appt.start_time.slice(0, 5)}
                        {appt.assignee?.first_name && (
                          <> · {appt.assignee.first_name}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={appt.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyPetsState() {
  return (
    <div className="rounded-2xl border-2 border-dashed bg-card/50 p-8 text-center">
      <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10">
        <PawPrint className="size-7 text-primary" />
      </div>
      <p className="text-base font-semibold">
        Pronto verás aquí a tus regalones
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        La clínica registrará a tus mascotas en tu próxima visita.
      </p>
    </div>
  );
}

function formatDateLong(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "pending"
      ? "Por confirmar"
      : status === "confirmed"
      ? "Confirmada"
      : status;
  const tone =
    status === "confirmed"
      ? "bg-emerald-500/15 text-emerald-700"
      : "bg-amber-500/15 text-amber-700";
  return (
    <Badge className={`${tone} text-[10px]`}>{label}</Badge>
  );
}
