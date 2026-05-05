import Link from "next/link";
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
import { formatSpecies } from "@/lib/validations/clients";
import { RequestAppointmentButton } from "./_components/request-appointment-button";
import { VaccineReminderBanner } from "./_components/vaccine-reminder-banner";
import type { VaccineAlert } from "./_components/vaccine-reminder-banner";
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

  const hello = firstName ? `${greeting()}, ${firstName}` : greeting();
  const subtitle =
    pets.length === 0
      ? "Pronto verás aquí la información de tus mascotas."
      : pets.length === 1
        ? `¿Cómo está ${pets[0].name}?`
        : "Tus engreídos del día";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {hello}
          </h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {pets.length > 0 && (
          <RequestAppointmentButton clinicSlug={clinic} pets={pets} />
        )}
      </div>

      {alerts.length > 0 && tutorId && (
        <VaccineReminderBanner
          clinicSlug={clinic}
          tutorId={tutorId}
          alerts={alerts}
        />
      )}

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
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No tienes horas reservadas.
              </p>
              {pets.length > 0 && (
                <div className="mt-3">
                  <RequestAppointmentButton
                    clinicSlug={clinic}
                    pets={pets}
                    variant="outline"
                  />
                </div>
              )}
            </div>
          ) : (
            <ul className="divide-y">
              {upcoming.map((appt) => (
                <li
                  key={appt.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PawPrint className="size-4" />
            {pets.length === 1 ? "Mi mascota" : "Mis mascotas"}
            <Badge variant="secondary">{pets.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pets.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no hay mascotas registradas. La clínica las irá agregando a
              tu ficha.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pets.map((pet) => (
                <Link
                  key={pet.id}
                  href={`/tutor/${clinic}/pets/${pet.id}`}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/50 hover:bg-muted/30"
                >
                  {pet.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pet.photo_url}
                      alt={pet.name}
                      className="size-12 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <PawPrint className="size-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{pet.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        formatSpecies(pet.species),
                        pet.breed,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Sin datos"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
