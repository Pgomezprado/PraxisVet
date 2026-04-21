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
import { Button } from "@/components/ui/button";
import { formatSpecies } from "@/lib/validations/clients";
import { RequestAppointmentButton } from "./_components/request-appointment-button";
import {
  getTutorPets,
  getTutorUpcomingAppointments,
} from "./queries";

export const dynamic = "force-dynamic";

export default async function TutorHomePage({
  params,
}: {
  params: Promise<{ clinic: string }>;
}) {
  const { clinic } = await params;
  const supabase = await createClient();

  const [pets, upcoming] = await Promise.all([
    getTutorPets(supabase),
    getTutorUpcomingAppointments(supabase),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Hola, bienvenido a tu portal
          </h1>
          <p className="text-sm text-muted-foreground">
            Aquí puedes ver tus próximas citas y la información de tus
            mascotas.
          </p>
        </div>
        {pets.length > 0 && (
          <RequestAppointmentButton clinicSlug={clinic} pets={pets} />
        )}
      </div>

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
                No tienes citas próximas.
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
            Mis mascotas
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
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return (
    <Badge className={`${tone} text-[10px]`}>{label}</Badge>
  );
}
