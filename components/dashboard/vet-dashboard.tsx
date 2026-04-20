import {
  CalendarDays,
  CheckCircle2,
  Stethoscope,
  Plus,
  ClipboardList,
} from "lucide-react";
import type { Organization, OrganizationMember } from "@/types";
import { HeroGreeting } from "./widgets/hero-greeting";
import { KpiCard } from "./widgets/kpi-card";
import { QuickActions } from "./widgets/quick-actions";
import { WeekAgenda } from "./widgets/week-agenda";
import { NextAppointmentCard } from "./widgets/next-appointment-card";
import type { TodayAppointment } from "@/app/[clinic]/dashboard/queries";
import { formatCountdown, minutesUntil } from "@/lib/utils/format";

export function VetDashboard({
  organization,
  member,
  stats,
  agenda,
  nextAppointment,
}: {
  organization: Organization;
  member: OrganizationMember;
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
  };
  agenda: TodayAppointment[];
  nextAppointment: TodayAppointment | null;
}) {
  const clinicSlug = organization.slug;
  const today = new Date().toISOString().split("T")[0];
  const todayHref = `/${clinicSlug}/appointments?view=day&date=${today}`;
  const title = member.first_name
    ? `Hola, ${member.first_name}`
    : "Tu jornada";

  const highlight = nextAppointment
    ? `Próxima: ${nextAppointment.pet?.name ?? "paciente"} ${formatCountdown(
        minutesUntil(nextAppointment.start_time)
      )}`
    : stats.total === 0
      ? "Sin citas asignadas hoy"
      : `${stats.total} paciente${stats.total > 1 ? "s" : ""} hoy`;

  return (
    <div className="space-y-8">
      <HeroGreeting
        name={title}
        subtitle={
          member.specialty
            ? `${member.specialty} · ${organization.name}`
            : organization.name
        }
        highlights={highlight}
        actions={
          <QuickActions
            actions={[
              {
                label: "Cita",
                href: `/${clinicSlug}/appointments/new`,
                icon: Plus,
              },
              {
                label: "Consulta walk-in",
                href: `/${clinicSlug}/appointments/new?walkin=1`,
                icon: ClipboardList,
                variant: "outline",
              },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          title="Mis citas hoy"
          value={stats.total}
          description="Asignadas a mí"
          icon={CalendarDays}
          tone="teal"
          href={todayHref}
          ariaLabel="Ver agenda del día"
        />
        <KpiCard
          title="En curso"
          value={stats.inProgress}
          description="Atendiendo ahora"
          icon={Stethoscope}
          tone="amber"
          href={`${todayHref}&status=in_progress`}
          ariaLabel="Ver citas en curso"
        />
        <KpiCard
          title="Completadas"
          value={stats.completed}
          description="Cerradas hoy"
          icon={CheckCircle2}
          tone="emerald"
          href={`${todayHref}&status=completed`}
          ariaLabel="Ver citas completadas hoy"
        />
      </div>

      <NextAppointmentCard
        appointment={nextAppointment}
        clinicSlug={clinicSlug}
        emptyTitle="No tienes más citas hoy"
        emptyDescription="Tu agenda está libre. Buen momento para actualizar historias clínicas."
      />

      <WeekAgenda
        title="Mi agenda de la semana"
        description={
          agenda.length > 0
            ? `${agenda.length} cita${agenda.length > 1 ? "s" : ""} esta semana`
            : undefined
        }
        appointments={agenda}
        emptyTitle="Semana sin citas asignadas"
        emptyDescription="No tienes pacientes asignados esta semana. Revisa la agenda completa de la clínica para ver el panorama."
        emptyAction={{
          label: "Ver agenda completa",
          href: `/${clinicSlug}/appointments?view=week`,
        }}
        clinicSlug={clinicSlug}
      />
    </div>
  );
}
