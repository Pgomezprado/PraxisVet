import {
  CalendarDays,
  Users,
  DollarSign,
  PawPrint,
  Plus,
  Receipt,
  UserPlus,
} from "lucide-react";
import type { Organization, OrganizationMember } from "@/types";
import { HeroGreeting } from "./widgets/hero-greeting";
import { KpiCard } from "./widgets/kpi-card";
import { QuickActions } from "./widgets/quick-actions";
import { DayAgenda } from "./widgets/day-agenda";
import { UrgentAttentionWidget } from "./widgets/urgent-attention";
import { PendingPaymentsWidget } from "./widgets/pending-payments";
import { RecentActivityWidget } from "./widgets/recent-activity";
import { OnboardingChecklist } from "./widgets/onboarding-checklist";
import { formatCLP } from "@/lib/utils/format";
import type {
  TodayAppointment,
  UrgentAttention,
  PendingPayment,
} from "@/app/[clinic]/dashboard/queries";

export function AdminDashboard({
  organization,
  member,
  counts,
  monthRevenue,
  dayRevenue,
  agenda,
  recentClients,
  urgent,
  pendingPayments,
}: {
  organization: Organization;
  member: OrganizationMember;
  counts: {
    appointmentsToday: number;
    totalClients: number;
    totalPets: number;
    totalServices: number;
  };
  monthRevenue: number;
  dayRevenue: number;
  agenda: TodayAppointment[];
  recentClients: { id: string; first_name: string; last_name: string; created_at: string }[];
  urgent: UrgentAttention;
  pendingPayments: PendingPayment[];
}) {
  const clinicSlug = organization.slug;
  const greetingName = member.first_name
    ? `${organization.name}`
    : organization.name;

  const highlights = `${counts.appointmentsToday} cita${
    counts.appointmentsToday === 1 ? "" : "s"
  } · ${formatCLP(dayRevenue)} cobrado hoy`;

  const onboardingSteps = [
    {
      label: "Configura los servicios que ofrece tu clínica",
      href: `/${clinicSlug}/settings/services`,
      completed: counts.totalServices > 0,
    },
    {
      label: "Registra a tu primer cliente y su mascota",
      href: `/${clinicSlug}/clients`,
      completed: counts.totalClients > 0,
    },
    {
      label: "Agenda tu primera cita",
      href: `/${clinicSlug}/appointments`,
      completed: counts.appointmentsToday > 0,
    },
    {
      label: "Configura tu equipo y ajustes generales",
      href: `/${clinicSlug}/settings/team`,
      completed: false,
    },
  ];

  return (
    <div className="space-y-8">
      <HeroGreeting
        name={greetingName}
        subtitle={`Hola ${member.first_name ?? "admin"}, aquí está tu clínica hoy.`}
        highlights={highlights}
        actions={
          <QuickActions
            actions={[
              {
                label: "Cita",
                href: `/${clinicSlug}/appointments/new`,
                icon: Plus,
              },
              {
                label: "Cliente",
                href: `/${clinicSlug}/clients/new`,
                icon: UserPlus,
                variant: "secondary",
              },
              {
                label: "Cobro",
                href: `/${clinicSlug}/billing/new`,
                icon: Receipt,
                variant: "outline",
              },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ingresos hoy"
          value={formatCLP(dayRevenue)}
          description="Cobrado en el día"
          icon={DollarSign}
          tone="emerald"
        />
        <KpiCard
          title="Ingresos del mes"
          value={formatCLP(monthRevenue)}
          description="Acumulado"
          icon={DollarSign}
          tone="sky"
        />
        <KpiCard
          title="Citas hoy"
          value={counts.appointmentsToday}
          description="Agenda completa"
          icon={CalendarDays}
          tone="teal"
        />
        <KpiCard
          title="Clientes"
          value={counts.totalClients}
          description={`${counts.totalPets} mascotas`}
          icon={Users}
          tone="amber"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <UrgentAttentionWidget data={urgent} clinicSlug={clinicSlug} />
        </div>
        <div className="lg:col-span-2">
          <PendingPaymentsWidget
            payments={pendingPayments}
            clinicSlug={clinicSlug}
          />
        </div>
      </div>

      <DayAgenda
        title="Agenda del día"
        description={
          agenda.length > 0
            ? `${agenda.length} cita${agenda.length > 1 ? "s" : ""} programada${
                agenda.length > 1 ? "s" : ""
              }`
            : undefined
        }
        appointments={agenda}
        emptyTitle="Sin citas programadas para hoy"
        emptyDescription="Cuando agendes una cita, aparecerá aquí lista para iniciar la consulta."
        emptyAction={{
          label: "Agendar una cita",
          href: `/${clinicSlug}/appointments/new`,
        }}
        clinicSlug={clinicSlug}
        maxHeight
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivityWidget clients={recentClients} clinicSlug={clinicSlug} />
        <KpiCard
          title="Mascotas"
          value={counts.totalPets}
          description="Total registradas"
          icon={PawPrint}
          tone="rose"
        />
      </div>

      <OnboardingChecklist steps={onboardingSteps} />
    </div>
  );
}
