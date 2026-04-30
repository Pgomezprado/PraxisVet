import {
  CalendarDays,
  Users,
  PawPrint,
  Plus,
  UserPlus,
} from "lucide-react";
import type { Organization, OrganizationMember } from "@/types";
import { HeroGreeting } from "./widgets/hero-greeting";
import { KpiCard } from "./widgets/kpi-card";
import { QuickActions } from "./widgets/quick-actions";
import { UrgentAttentionWidget } from "./widgets/urgent-attention";
import { RecentActivityWidget } from "./widgets/recent-activity";
import { OnboardingChecklist } from "./widgets/onboarding-checklist";
import type {
  UrgentAttention,
  OnboardingStatus,
} from "@/app/[clinic]/dashboard/queries";

export function AdminDashboard({
  organization,
  member,
  counts,
  recentClients,
  urgent,
  onboarding,
}: {
  organization: Organization;
  member: OrganizationMember;
  counts: {
    appointmentsToday: number;
    totalClients: number;
    totalPets: number;
    totalServices: number;
  };
  recentClients: { id: string; first_name: string; last_name: string; created_at: string }[];
  urgent: UrgentAttention;
  onboarding: OnboardingStatus;
}) {
  const clinicSlug = organization.slug;
  const todayDate = new Date().toISOString().split("T")[0];
  const greetingName = member.first_name
    ? `${organization.name}`
    : organization.name;

  const highlights = `${counts.appointmentsToday} cita${
    counts.appointmentsToday === 1 ? "" : "s"
  } hoy`;

  const onboardingSteps = [
    {
      label: "Carga al menos 3 servicios con precio",
      href: `/${clinicSlug}/settings/services`,
      completed: onboarding.servicesWithPrice >= 3,
    },
    {
      label: "Invita a todo tu equipo",
      href: `/${clinicSlug}/settings/team`,
      completed:
        onboarding.membersTotal > 0 &&
        onboarding.membersLinked === onboarding.membersTotal,
    },
    {
      label: "Agrega RUT a tus clientes",
      href: `/${clinicSlug}/clients`,
      completed:
        onboarding.clientsTotal === 0 || onboarding.clientsWithRut >= 1,
    },
    {
      label: "Carga tu primer producto al inventario",
      href: `/${clinicSlug}/inventory/new`,
      completed: onboarding.productsActive > 0,
    },
    {
      label: "Agenda tu primera cita",
      href: `/${clinicSlug}/appointments/new`,
      completed: onboarding.appointmentsTotal > 0,
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
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          title="Citas hoy"
          value={counts.appointmentsToday}
          description="Agenda completa"
          icon={CalendarDays}
          tone="teal"
          href={`/${clinicSlug}/appointments?view=day&date=${todayDate}`}
          ariaLabel="Ver agenda del día"
        />
        <KpiCard
          title="Clientes"
          value={counts.totalClients}
          description={`${counts.totalPets} mascotas`}
          icon={Users}
          tone="amber"
          href={`/${clinicSlug}/clients`}
          ariaLabel="Ver clientes"
        />
        <KpiCard
          title="Mascotas"
          value={counts.totalPets}
          description="Total registradas"
          icon={PawPrint}
          tone="rose"
          href={`/${clinicSlug}/clients`}
          ariaLabel="Ver clientes y mascotas"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <UrgentAttentionWidget data={urgent} clinicSlug={clinicSlug} />
        <RecentActivityWidget clients={recentClients} clinicSlug={clinicSlug} />
      </div>

      <OnboardingChecklist steps={onboardingSteps} />
    </div>
  );
}
