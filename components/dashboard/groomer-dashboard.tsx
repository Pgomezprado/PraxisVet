import {
  Scissors,
  CheckCircle2,
  CalendarDays,
  Plus,
} from "lucide-react";
import type { Organization, OrganizationMember } from "@/types";
import { HeroGreeting } from "./widgets/hero-greeting";
import { KpiCard } from "./widgets/kpi-card";
import { QuickActions } from "./widgets/quick-actions";
import { DayAgenda } from "./widgets/day-agenda";
import { NextAppointmentCard } from "./widgets/next-appointment-card";
import { formatCountdown, minutesUntil } from "@/lib/utils/format";
import type { TodayAppointment } from "@/app/[clinic]/dashboard/queries";

export function GroomerDashboard({
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
  const title = member.first_name
    ? `Hola, ${member.first_name}`
    : "Mis servicios de hoy";

  const highlight = nextAppointment
    ? `Próximo: ${nextAppointment.pet?.name ?? "servicio"} ${formatCountdown(
        minutesUntil(nextAppointment.start_time)
      )}`
    : stats.total === 0
      ? "Sin servicios asignados hoy"
      : `${stats.total} servicio${stats.total > 1 ? "s" : ""} hoy`;

  return (
    <div className="space-y-8">
      <HeroGreeting
        name={title}
        subtitle={`Peluquería · ${organization.name}`}
        highlights={highlight}
        actions={
          <QuickActions
            actions={[
              {
                label: "Nuevo servicio",
                href: `/${clinicSlug}/appointments/new?type=grooming`,
                icon: Plus,
              },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          title="Servicios hoy"
          value={stats.total}
          description="Asignados a mí"
          icon={CalendarDays}
          tone="teal"
        />
        <KpiCard
          title="En proceso"
          value={stats.inProgress}
          description="Atendiendo ahora"
          icon={Scissors}
          tone="amber"
        />
        <KpiCard
          title="Completados"
          value={stats.completed}
          description="Cerrados hoy"
          icon={CheckCircle2}
          tone="emerald"
        />
      </div>

      <NextAppointmentCard
        appointment={nextAppointment}
        clinicSlug={clinicSlug}
        emptyTitle="No tienes más servicios hoy"
        emptyDescription="Tu agenda está libre. Aprovecha para organizar tu estación."
      />

      <DayAgenda
        title="Mi agenda de peluquería"
        description={
          agenda.length > 0
            ? `${agenda.length} servicio${agenda.length > 1 ? "s" : ""}`
            : undefined
        }
        appointments={agenda}
        emptyTitle="Sin servicios asignados hoy"
        emptyDescription="No tienes servicios de peluquería asignados para hoy. Avisa a la recepcionista si esperabas alguno."
        clinicSlug={clinicSlug}
        maxHeight
      />
    </div>
  );
}
