import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Syringe,
  Bug,
  Scissors,
  FlaskConical,
  CalendarDays,
  Sparkles,
  QrCode,
  PawPrint,
} from "lucide-react";
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
import { formatPetAge } from "@/lib/utils/format";
import { formatSpecies } from "@/lib/validations/clients";
import {
  getTutorPet,
  getPetVaccinations,
  getPetDewormings,
  getPetGroomingRecords,
  getPetSharedExams,
  getPetAppointments,
} from "../../tutor/[clinic]/queries";
import {
  AddManualDewormingDialog,
  AddManualVaccinationDialog,
} from "../_components/manual-record-dialogs";
import { PersonalPetPhotoEdit } from "../_components/personal-pet-photo-edit";
import { PersonalPetProfileCard } from "../_components/personal-pet-profile-card";
import { ShareCard } from "../_components/share-card";
import type { TutorProfile } from "../actions";

export const dynamic = "force-dynamic";

function formatDateCL(date: string | null): string {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  return `${d}-${m}-${y}`;
}

function classifyDue(nextDue: string | null): {
  state: "vigente" | "por_vencer" | "vencida" | "sin_proxima";
  days: number | null;
} {
  if (!nextDue) return { state: "sin_proxima", days: null };
  const due = new Date(nextDue + "T12:00:00");
  const now = new Date();
  const days = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { state: "vencida", days };
  if (days <= 30) return { state: "por_vencer", days };
  return { state: "vigente", days };
}

function dueBadgeVariant(state: ReturnType<typeof classifyDue>["state"]) {
  if (state === "vencida" || state === "por_vencer") return "destructive" as const;
  if (state === "vigente") return "outline" as const;
  return "outline" as const;
}

type PetWithOrg = Awaited<ReturnType<typeof getTutorPet>> & {
  org: { id: string; name: string; slug: string } | null;
};

export default async function MascotaDetailPage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: petOrgRow } = await supabase
    .from("pets")
    .select(
      `
      id, tutor_profile,
      clients!inner ( organizations!inner ( id, name, slug, is_personal ) )
    `
    )
    .eq("id", petId)
    .maybeSingle();

  type PetOrgRow = {
    id: string;
    tutor_profile: Record<string, unknown> | null;
    clients: {
      organizations: {
        id: string;
        name: string;
        slug: string;
        is_personal: boolean | null;
      } | null;
    } | null;
  };
  const petOrg = petOrgRow as unknown as PetOrgRow | null;
  const orgInfo = petOrg?.clients?.organizations ?? null;
  if (!orgInfo) notFound();
  const isPersonal = orgInfo.is_personal === true;
  const tutorProfile = (petOrg?.tutor_profile ?? {}) as TutorProfile;

  const [pet, vaccinations, dewormings, groomings, sharedExams, appointments] =
    await Promise.all([
      getTutorPet(supabase, petId),
      getPetVaccinations(supabase, petId),
      getPetDewormings(supabase, petId),
      getPetGroomingRecords(supabase, petId),
      getPetSharedExams(supabase, petId),
      getPetAppointments(supabase, petId),
    ]);

  if (!pet) notFound();

  const age = formatPetAge(pet.birthdate);
  const upcomingAppointments = appointments
    .filter((a) => a.date >= new Date().toISOString().slice(0, 10))
    .filter((a) => a.status === "pending" || a.status === "confirmed");

  const nextVacc = vaccinations
    .filter((v) => v.next_due_date)
    .sort((a, b) => (a.next_due_date! > b.next_due_date! ? 1 : -1))[0];
  const nextVaccState = classifyDue(nextVacc?.next_due_date ?? null);

  const nextDew = dewormings
    .filter((d) => d.next_due_date)
    .sort((a, b) => (a.next_due_date! > b.next_due_date! ? 1 : -1))[0];
  const nextDewState = classifyDue(nextDew?.next_due_date ?? null);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link
        href="/mascotas/salud"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Mis mascotas
      </Link>

      <header className="flex flex-col gap-4 md:flex-row md:items-center">
        {isPersonal ? (
          <PersonalPetPhotoEdit
            petId={pet.id}
            orgId={orgInfo.id}
            initialPhotoUrl={pet.photo_url}
          />
        ) : (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-primary/10 md:h-28 md:w-28">
            {pet.photo_url ? (
              <Image
                src={pet.photo_url}
                alt={pet.name}
                fill
                sizes="(min-width: 768px) 112px, 96px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary">
                <PawPrint className="h-10 w-10" />
              </div>
            )}
          </div>
        )}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {pet.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[formatSpecies(pet.species), pet.breed].filter(Boolean).join(" · ")}
            {age ? ` · ${age}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            {isPersonal ? "Modo personal" : `Atendida en ${orgInfo.name}`}
          </p>
        </div>
      </header>

      {isPersonal && (
        <PersonalPetProfileCard
          petId={pet.id}
          petName={pet.name}
          profile={tutorProfile}
        />
      )}

      {(nextVaccState.state === "vencida" || nextVaccState.state === "por_vencer") &&
        nextVacc && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                  <Syringe className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    {nextVaccState.state === "vencida"
                      ? `Vacuna ${nextVacc.vaccine_name} vencida`
                      : `Vacuna ${nextVacc.vaccine_name} próxima`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {nextVaccState.state === "vencida"
                      ? `Venció el ${formatDateCL(nextVacc.next_due_date)}`
                      : `Toca el ${formatDateCL(nextVacc.next_due_date)}`}
                  </p>
                </div>
              </div>
              {!isPersonal && (
                <Button
                  size="sm"
                  render={<Link href={`/tutor/${orgInfo.slug}?from=hub`} />}
                >
                  Reservar hora
                </Button>
              )}
            </CardContent>
          </Card>
        )}

      {!isPersonal && (
        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <QrCode className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <CardTitle className="text-lg">
                Cartola QR para emergencias
              </CardTitle>
              <CardDescription>
                Pasaporte sanitario para hoteles, paseadores y viajes. Genera un
                código QR con la salud al día de {pet.name}.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link href={`/tutor/${orgInfo.slug}/pets/${pet.id}?from=hub`} />
              }
            >
              <QrCode className="h-4 w-4" />
              Generar cartola QR
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Syringe className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <CardTitle className="text-base">Vacunas</CardTitle>
              <CardDescription>
                {vaccinations.length === 0
                  ? "Aún no hay vacunas registradas."
                  : `${vaccinations.length} aplicadas`}
              </CardDescription>
            </div>
            {nextVacc && (
              <Badge variant={dueBadgeVariant(nextVaccState.state)}>
                Próxima {formatDateCL(nextVacc.next_due_date)}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {vaccinations.slice(0, 3).map((v) => (
              <div
                key={v.id}
                className="rounded-md border border-border/60 bg-card/40 p-2.5"
              >
                <p className="text-sm font-medium">{v.vaccine_name}</p>
                <p className="text-xs text-muted-foreground">
                  Aplicada {formatDateCL(v.date_administered)}
                  {v.next_due_date
                    ? ` · próxima ${formatDateCL(v.next_due_date)}`
                    : ""}
                </p>
              </div>
            ))}
            {vaccinations.length > 3 && (
              <p className="pt-1 text-xs text-muted-foreground">
                +{vaccinations.length - 3} más
              </p>
            )}
            {isPersonal && (
              <div className="pt-2">
                <AddManualVaccinationDialog petId={pet.id} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bug className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <CardTitle className="text-base">Desparasitaciones</CardTitle>
              <CardDescription>
                {dewormings.length === 0
                  ? "Aún no hay registros."
                  : `${dewormings.length} aplicadas`}
              </CardDescription>
            </div>
            {nextDew && (
              <Badge variant={dueBadgeVariant(nextDewState.state)}>
                Próxima {formatDateCL(nextDew.next_due_date)}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {dewormings.slice(0, 3).map((d) => (
              <div
                key={d.id}
                className="rounded-md border border-border/60 bg-card/40 p-2.5"
              >
                <p className="text-sm font-medium">{d.product ?? d.type}</p>
                <p className="text-xs text-muted-foreground">
                  Aplicada {formatDateCL(d.date_administered)}
                  {d.next_due_date
                    ? ` · próxima ${formatDateCL(d.next_due_date)}`
                    : ""}
                </p>
              </div>
            ))}
            {dewormings.length > 3 && (
              <p className="pt-1 text-xs text-muted-foreground">
                +{dewormings.length - 3} más
              </p>
            )}
            {isPersonal && (
              <div className="pt-2">
                <AddManualDewormingDialog petId={pet.id} />
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {sharedExams.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FlaskConical className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <CardTitle className="text-base">
                Exámenes compartidos por tu vet
              </CardTitle>
              <CardDescription>
                {sharedExams.length}{" "}
                {sharedExams.length === 1 ? "examen disponible" : "exámenes disponibles"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {sharedExams.slice(0, 4).map((e) => (
              <div
                key={e.id}
                className="rounded-md border border-border/60 bg-card/40 p-2.5"
              >
                <p className="text-sm font-medium">
                  {e.custom_type_label ?? e.type}
                </p>
                <p className="text-xs text-muted-foreground">
                  Resultado {formatDateCL(e.result_date)}
                  {e.vet_interpretation
                    ? ` · ${e.vet_interpretation.slice(0, 80)}${e.vet_interpretation.length > 80 ? "…" : ""}`
                    : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {groomings.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Scissors className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <CardTitle className="text-base">Peluquería</CardTitle>
              <CardDescription>
                {groomings.length}{" "}
                {groomings.length === 1 ? "servicio registrado" : "servicios registrados"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {groomings.slice(0, 3).map((g) => (
              <div
                key={g.id}
                className="rounded-md border border-border/60 bg-card/40 p-2.5"
              >
                <p className="text-sm font-medium">
                  {g.service?.name ?? g.service_performed ?? "Servicio"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateCL(g.date)}
                  {g.groomer
                    ? ` · ${g.groomer.first_name ?? ""} ${g.groomer.last_name ?? ""}`.trim()
                    : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {upcomingAppointments.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <CardTitle className="text-base">Próximas citas</CardTitle>
              <CardDescription>
                {upcomingAppointments.length}{" "}
                {upcomingAppointments.length === 1 ? "agendada" : "agendadas"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {upcomingAppointments.slice(0, 4).map((a) => (
              <div
                key={a.id}
                className="rounded-md border border-border/60 bg-card/40 p-2.5"
              >
                <p className="text-sm font-medium">
                  {a.service?.name ?? a.reason ?? "Cita"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateCL(a.date)} · {a.start_time?.slice(0, 5)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!isPersonal && (
        <Card className="border-dashed">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <CardTitle className="text-base">
                La historia de {pet.name}
              </CardTitle>
              <CardDescription>
                Cada visita, vacuna y momento guardados en orden.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link
                  href={`/tutor/${orgInfo.slug}/pets/${pet.id}/historia?from=hub`}
                />
              }
            >
              Ver historia completa
            </Button>
          </CardContent>
        </Card>
      )}

      <ShareCard
        variant={isPersonal ? "both" : "tutor-only"}
        petName={pet.name}
        petId={pet.id}
      />
    </div>
  );
}
