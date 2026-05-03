import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PawPrint, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatSpecies } from "@/lib/validations/clients";
import { HistoriaTimeline } from "./_components/HistoriaTimeline";
import {
  formatTenureSince,
  mergeTimelineEvents,
  summarizeHistory,
  type MedicalConsultData,
  type TimelineEvent,
} from "./_lib/timeline";

export const dynamic = "force-dynamic";

type AppointmentRow = {
  id: string;
  date: string;
  status: string;
  type: string;
  organization_members: {
    first_name: string | null;
    last_name: string | null;
  } | null;
};

type ExamRow = {
  id: string;
  type: string;
  custom_type_label: string | null;
  result_date: string | null;
  shared_with_tutor_at: string;
  vet_interpretation: string | null;
  result_file_name: string | null;
};

type GroomingRow = {
  id: string;
  date: string;
  service_performed: string | null;
  observations: string | null;
  organization_members: {
    first_name: string | null;
    last_name: string | null;
  } | null;
};

export default async function HistoriaPage({
  params,
}: {
  params: Promise<{ clinic: string; petId: string }>;
}) {
  const { clinic, petId } = await params;
  const supabase = await createClient();

  // 1) Mascota + clínica
  const [petRes, orgRes] = await Promise.all([
    supabase
      .from("pets")
      .select(
        "id, name, species, breed, sex, birthdate, photo_url, microchip, color, size, weight, created_at"
      )
      .eq("id", petId)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("name")
      .eq("slug", clinic)
      .maybeSingle(),
  ]);

  const pet = petRes.data as
    | {
        id: string;
        name: string;
        species: string | null;
        breed: string | null;
        sex: string | null;
        birthdate: string | null;
        photo_url: string | null;
        microchip: string | null;
        color: string | null;
        size: string | null;
        weight: number | null;
        created_at: string | null;
      }
    | null;

  if (!pet) {
    notFound();
  }

  const clinicName =
    (orgRes.data as { name: string } | null)?.name ?? "tu clínica";

  // 2) Datos timeline (en paralelo)
  const [
    vaccinationsRes,
    dewormingsRes,
    appointmentsRes,
    examsRes,
    groomingsRes,
  ] = await Promise.all([
    supabase
      .from("vaccinations")
      .select(
        "id, vaccine_name, date_administered, next_due_date, lot_number, administered_by"
      )
      .eq("pet_id", pet.id)
      .order("date_administered", { ascending: false }),
    supabase
      .from("dewormings")
      .select("id, type, date_administered, next_due_date, product")
      .eq("pet_id", pet.id)
      .order("date_administered", { ascending: false }),
    // Citas: TODAS para sacar firstAppointmentDate; filtramos completed+medical en código
    supabase
      .from("appointments")
      .select(
        `
        id, date, status, type,
        organization_members!appointments_assigned_to_fkey ( first_name, last_name )
      `
      )
      .eq("pet_id", pet.id)
      .order("date", { ascending: true }),
    supabase
      .from("clinical_record_exams")
      .select(
        "id, type, custom_type_label, result_date, shared_with_tutor_at, vet_interpretation, result_file_name"
      )
      .eq("pet_id", pet.id)
      .eq("status", "resultado_cargado")
      .not("shared_with_tutor_at", "is", null)
      .order("shared_with_tutor_at", { ascending: false }),
    supabase
      .from("grooming_records")
      .select(
        `
        id, date, service_performed, observations,
        organization_members!grooming_records_groomer_id_fkey ( first_name, last_name )
      `
      )
      .eq("pet_id", pet.id)
      .order("date", { ascending: false }),
  ]);

  const allAppointments = (appointmentsRes.data ?? []) as unknown as AppointmentRow[];

  // Consultas médicas neutralizadas: solo type='medical' + status='completed'
  const medicalConsults: MedicalConsultData[] = allAppointments
    .filter((a) => a.type === "medical" && a.status === "completed")
    .map((a) => ({
      id: a.id,
      date: a.date,
      vetName: formatVetName(
        a.organization_members?.first_name ?? null,
        a.organization_members?.last_name ?? null
      ),
    }));

  // Welcome date: primera cita NO cancelada/no-show. Las citas canceladas
  // pueden tener fechas pasadas (importación legacy) y harían retroceder
  // el "EL PRINCIPIO" a una fecha incorrecta.
  const firstValidAppointment = allAppointments.find(
    (a) => a.status !== "cancelled" && a.status !== "no_show"
  );
  const firstAppointmentDate = firstValidAppointment?.date ?? null;

  const exams = (examsRes.data ?? []) as unknown as ExamRow[];

  const groomings = (groomingsRes.data ?? []).map((raw) => {
    const r = raw as unknown as GroomingRow;
    return {
      id: r.id,
      date: r.date,
      service_performed: r.service_performed,
      observations: r.observations,
      groomerName: formatFullName(
        r.organization_members?.first_name ?? null,
        r.organization_members?.last_name ?? null
      ),
    };
  });

  const { events, welcomeDate, earliestDate } = mergeTimelineEvents({
    petName: pet.name,
    birthdate: pet.birthdate,
    petCreatedAt: pet.created_at,
    clinicName,
    deceasedAt: null, // columna no existe en V1
    vaccinations: vaccinationsRes.data ?? [],
    dewormings: dewormingsRes.data ?? [],
    medicalConsults,
    firstAppointmentDate,
    exams: exams.map((e) => ({
      id: e.id,
      type: e.type,
      custom_type_label: e.custom_type_label,
      result_date: e.result_date,
      shared_with_tutor_at: e.shared_with_tutor_at,
      vet_interpretation: e.vet_interpretation,
      result_file_name: e.result_file_name,
    })),
    groomings,
  });

  const { momentsCount, yearsCount } = summarizeHistory(events, earliestDate);

  // Serializar fechas a ISO para pasarlas al cliente
  const serialized = events.map((e) => ({
    ...e,
    dateIso: e.date.toISOString(),
    date: undefined as unknown as Date,
  }));
  // (cleanup)
  for (const s of serialized) {
    delete (s as Partial<TimelineEvent & { date?: Date }>).date;
  }

  const age = pet.birthdate ? calculateAgeShort(pet.birthdate) : null;
  const speciesLabel = formatSpecies(pet.species);
  const tenure = formatTenureSince(welcomeDate);
  const realCount = momentsCount;
  const isEmpty = realCount === 0;
  const isPoor = realCount > 0 && realCount < 5;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          render={
            <Link
              href={`/tutor/${clinic}/pets/${petId}`}
              aria-label={`Volver a ${pet.name}`}
            />
          }
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-xl font-semibold leading-tight">
            La historia de {pet.name}
          </h1>
        </div>
      </div>

      {/* Hero */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
          {pet.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pet.photo_url}
              alt={pet.name}
              className="size-24 shrink-0 rounded-full object-cover ring-4 ring-primary/15 sm:size-28"
            />
          ) : (
            <div className="flex size-24 shrink-0 items-center justify-center rounded-full bg-primary/15 ring-4 ring-primary/10 sm:size-28">
              <span className="font-heading text-3xl font-semibold text-primary">
                {pet.name[0]?.toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-heading text-3xl font-semibold leading-tight">
              {pet.name}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {[speciesLabel, pet.breed, age].filter(Boolean).join(" · ") ||
                "Sin datos"}
            </p>
            <p className="mt-3 text-sm text-foreground/90">
              Contigo en {clinicName} {tenure}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {momentsCount === 0
                ? "Aún no hay momentos guardados."
                : yearsCount > 0
                  ? `${momentsCount} ${momentsCount === 1 ? "momento" : "momentos"} · ${yearsCount} ${yearsCount === 1 ? "año" : "años"} de historia`
                  : `${momentsCount} ${momentsCount === 1 ? "momento" : "momentos"} guardados`}
            </p>
          </div>
          <div className="hidden sm:block">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href={`/tutor/${clinic}/pets/${petId}`} />}
            >
              <QrCode className="size-4" data-icon="inline-start" />
              Ver mi cartola QR
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CTA cartola en mobile */}
      <div className="sm:hidden">
        <Button
          variant="outline"
          className="w-full"
          render={<Link href={`/tutor/${clinic}/pets/${petId}`} />}
        >
          <QrCode className="size-4" data-icon="inline-start" />
          Ver mi cartola QR
        </Button>
      </div>

      {/* Estado vacío explícito */}
      {isEmpty ? (
        <div className="rounded-lg border border-dashed bg-card/40 p-6 text-center">
          <PawPrint className="mx-auto size-8 text-primary/70" />
          <p className="mt-3 font-heading text-base font-medium">
            La historia de {pet.name} recién está empezando.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada visita, vacuna y momento se irá guardando aquí.
          </p>
        </div>
      ) : null}

      {/* Timeline */}
      <HistoriaTimeline
        events={
          serialized as unknown as Parameters<typeof HistoriaTimeline>[0]["events"]
        }
        petName={pet.name}
        birthdate={pet.birthdate}
        clinicSlug={clinic}
        petId={pet.id}
      />

      {/* Pie para historias cortas */}
      {isPoor ? (
        <div className="rounded-lg border border-dashed bg-card/40 p-5 text-center text-sm text-muted-foreground">
          Esta historia recién comienza. Vuelve después de la próxima visita y
          verás cómo crece.
        </div>
      ) : null}
    </div>
  );
}

function formatVetName(
  first: string | null,
  last: string | null
): string | null {
  if (!last && !first) return null;
  // Asumimos prefijo Dr/a. genérico — sin distinción de género en el dato.
  const lastName = last?.trim() ?? "";
  const firstName = first?.trim() ?? "";
  if (lastName) return `Dr/a. ${lastName}`;
  return firstName ? `Dr/a. ${firstName}` : null;
}

function formatFullName(
  first: string | null,
  last: string | null
): string | null {
  const parts = [first?.trim(), last?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function calculateAgeShort(birthdate: string): string {
  const birth = new Date(birthdate + "T12:00:00");
  const now = new Date();
  const totalMonths =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth()) -
    (now.getDate() < birth.getDate() ? 1 : 0);
  if (totalMonths < 12) {
    return `${totalMonths} ${totalMonths === 1 ? "mes" : "meses"}`;
  }
  const years = Math.floor(totalMonths / 12);
  return years === 1 ? "1 año" : `${years} años`;
}
