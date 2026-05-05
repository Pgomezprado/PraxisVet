import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  PawPrint,
  Syringe,
  Bug,
  Stethoscope,
  Scissors,
  FlaskConical,
  Download,
  Sparkles,
} from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatSpecies } from "@/lib/validations/clients";
import { formatCLP } from "@/lib/utils/format";
import {
  getPetAppointments,
  getPetDewormings,
  getPetGroomingRecords,
  getPetSharedExams,
  getPetVaccinations,
  getTutorPet,
} from "../../queries";
import { listHealthCards } from "../../actions";
import { HealthCardButton } from "../../_components/health-card-button";
import { TutorPetPhoto } from "../../_components/tutor-pet-photo";

// Marca como "vigente" / "por_vencer" / "vencida" un item con next_due_date.
function classifyDue(nextDueDate: string | null, warningDays = 30) {
  if (!nextDueDate) return "vigente" as const;
  const due = new Date(nextDueDate + "T12:00:00");
  const now = new Date();
  const days = Math.floor(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days < 0) return "vencida" as const;
  if (days <= warningDays) return "por_vencer" as const;
  return "vigente" as const;
}

export const dynamic = "force-dynamic";

export default async function TutorPetDetailPage({
  params,
}: {
  params: Promise<{ clinic: string; petId: string }>;
}) {
  const { clinic, petId } = await params;
  const supabase = await createClient();

  const [
    pet,
    vaccinations,
    dewormings,
    groomings,
    appointments,
    sharedExams,
    healthCardsResult,
    orgRow,
  ] = await Promise.all([
    getTutorPet(supabase, petId),
    getPetVaccinations(supabase, petId),
    getPetDewormings(supabase, petId),
    getPetGroomingRecords(supabase, petId),
    getPetAppointments(supabase, petId),
    getPetSharedExams(supabase, petId),
    listHealthCards({ petId }),
    supabase
      .from("organizations")
      .select("name")
      .eq("slug", clinic)
      .maybeSingle(),
  ]);

  const initialHealthCards =
    healthCardsResult.success ? healthCardsResult.data : [];
  const clinicName =
    (orgRow.data as { name: string } | null)?.name ?? "tu clínica";

  // Estadísticas para el preview del Sheet de cartola.
  const vaccineStats = vaccinations.reduce(
    (acc, v) => {
      const s = classifyDue(v.next_due_date);
      if (s === "vigente") acc.vigentes += 1;
      else if (s === "por_vencer") acc.porVencer += 1;
      else acc.vencidas += 1;
      return acc;
    },
    { vigentes: 0, porVencer: 0, vencidas: 0 }
  );
  const dewormingsAtDay =
    dewormings.length > 0 &&
    dewormings.some((d) => classifyDue(d.next_due_date) !== "vencida");

  const examTypeLabels: Record<string, string> = {
    hemograma: "Hemograma",
    perfil_bioquimico: "Perfil bioquímico",
    urianalisis: "Urianálisis",
    rayos_x: "Rayos X",
    ecografia: "Ecografía",
    citologia: "Citología",
    biopsia: "Biopsia",
    otro: "Otro",
  };
  function examLabel(type: string, custom: string | null) {
    if (type === "otro" && custom?.trim()) return custom.trim();
    return examTypeLabels[type] ?? type;
  }

  if (!pet) {
    notFound();
  }

  const age = pet.birthdate ? calculateAge(pet.birthdate) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href={`/tutor/${clinic}`} />}
          aria-label="Volver al portal"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-4">
          <TutorPetPhoto
            clinicSlug={clinic}
            petId={pet.id}
            petName={pet.name}
            initialPhotoUrl={pet.photo_url}
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {pet.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[formatSpecies(pet.species), pet.breed, age]
                .filter(Boolean)
                .join(" · ") || "Sin datos"}
            </p>
          </div>
        </div>
      </div>

      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card ring-1 ring-primary/20">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-base font-semibold leading-tight">
                La historia de {pet.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Cada visita, vacuna y momento guardados en orden.
              </p>
            </div>
          </div>
          <Button
            className="w-full sm:w-auto"
            render={<Link href={`/tutor/${clinic}/pets/${pet.id}/historia`} />}
          >
            Ver la historia de {pet.name}
          </Button>
        </CardContent>
      </Card>

      <HealthCardButton
        clinicSlug={clinic}
        clinicName={clinicName}
        petId={pet.id}
        petName={pet.name}
        petSpecies={formatSpecies(pet.species)}
        petAge={age}
        vaccineStats={vaccineStats}
        dewormingsAtDay={dewormingsAtDay}
        initialCards={initialHealthCards}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Syringe className="size-4" />
              Vacunas
              <Badge variant="secondary">{vaccinations.length}</Badge>
            </CardTitle>
            <CardDescription>
              Historial de vacunaciones aplicadas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vaccinations.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Aún no hay vacunas registradas.
              </p>
            ) : (
              <ul className="space-y-3">
                {vaccinations.map((vac) => (
                  <li
                    key={vac.id}
                    className="rounded-md border p-3 text-sm"
                  >
                    <p className="font-medium">{vac.vaccine_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Aplicada: {formatDate(vac.date_administered)}
                      {vac.next_due_date && (
                        <>
                          {" · "}Próxima: {formatDate(vac.next_due_date)}
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="size-4" />
              Desparasitaciones
              <Badge variant="secondary">{dewormings.length}</Badge>
            </CardTitle>
            <CardDescription>
              Historial de tratamientos antiparasitarios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dewormings.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Aún no hay desparasitaciones registradas.
              </p>
            ) : (
              <ul className="space-y-3">
                {dewormings.map((dw) => (
                  <li
                    key={dw.id}
                    className="rounded-md border p-3 text-sm"
                  >
                    <p className="font-medium capitalize">
                      {dw.type === "interna"
                        ? "Desparasitación interna"
                        : "Desparasitación externa"}
                      {dw.product && (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {dw.product}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Aplicada: {formatDate(dw.date_administered)}
                      {dw.next_due_date && (
                        <>
                          {" · "}Próxima: {formatDate(dw.next_due_date)}
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="size-4" />
            Exámenes compartidos
            <Badge variant="secondary">{sharedExams.length}</Badge>
          </CardTitle>
          <CardDescription>
            Resultados que el veterinario compartió contigo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sharedExams.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Aún no hay exámenes compartidos.
            </p>
          ) : (
            <ul className="divide-y">
              {sharedExams.map((exam) => (
                <li
                  key={exam.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <FlaskConical className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {examLabel(exam.type, exam.custom_type_label)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {exam.result_date
                          ? formatDate(exam.result_date)
                          : "Sin fecha"}
                      </p>
                      {exam.vet_interpretation && (
                        <p className="mt-1 text-xs text-muted-foreground/90 line-clamp-3">
                          {exam.vet_interpretation}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <a
                        href={`/api/tutor/${clinic}/exams/${exam.id}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    <Download className="size-3.5" data-icon="inline-start" />
                    Descargar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="size-4" />
            Peluquería
            <Badge variant="secondary">{groomings.length}</Badge>
          </CardTitle>
          <CardDescription>
            Servicios de peluquería realizados a {pet.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groomings.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Aún no hay servicios de peluquería registrados.
            </p>
          ) : (
            <ul className="divide-y">
              {groomings.map((g) => {
                const groomerName =
                  g.groomer?.first_name || g.groomer?.last_name
                    ? `${g.groomer.first_name ?? ""} ${g.groomer.last_name ?? ""}`.trim()
                    : null;
                const serviceName =
                  g.service?.name ?? g.service_performed ?? "Servicio";
                return (
                  <li
                    key={g.id}
                    className="flex flex-wrap items-start justify-between gap-3 py-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <Scissors className="size-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{serviceName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(g.date)}
                          {groomerName && <> · {groomerName}</>}
                        </p>
                        {g.observations && (
                          <p className="mt-1 text-xs text-muted-foreground/80 line-clamp-2">
                            {g.observations}
                          </p>
                        )}
                      </div>
                    </div>
                    {g.price != null && (
                      <span className="text-sm font-medium tabular-nums">
                        {formatCLP(g.price)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-4" />
            Historial de citas
            <Badge variant="secondary">{appointments.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Sin citas registradas para esta mascota.
            </p>
          ) : (
            <ul className="divide-y">
              {appointments.map((appt) => (
                <li
                  key={appt.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      {appt.type === "grooming" ? (
                        <PawPrint className="size-4 text-primary" />
                      ) : (
                        <Stethoscope className="size-4 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {appt.service?.name ??
                          (appt.type === "grooming"
                            ? "Peluquería"
                            : "Consulta")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(appt.date)} ·{" "}
                        {appt.start_time.slice(0, 5)}
                        {appt.assignee?.first_name && (
                          <> · {appt.assignee.first_name}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      appt.status === "completed"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-[10px] capitalize"
                  >
                    {statusLabel(appt.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calculateAge(birthdate: string): string {
  const birth = new Date(birthdate + "T12:00:00");
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const totalMonths = years * 12 + months;
  if (totalMonths < 12) return `${totalMonths} meses`;
  const y = Math.floor(totalMonths / 12);
  return y === 1 ? "1 año" : `${y} años`;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Por confirmar",
    confirmed: "Confirmada",
    in_progress: "En atención",
    ready_for_pickup: "Lista para retiro",
    completed: "Realizada",
    cancelled: "Cancelada",
    no_show: "No asistió",
  };
  return labels[status] ?? status;
}
