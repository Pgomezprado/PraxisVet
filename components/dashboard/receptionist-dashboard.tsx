import {
  CalendarDays,
  Users,
  DollarSign,
  Bell,
  Plus,
  UserPlus,
  Receipt,
} from "lucide-react";
import type { Organization, OrganizationMember } from "@/types";
import { HeroGreeting } from "./widgets/hero-greeting";
import { KpiCard } from "./widgets/kpi-card";
import { QuickActions } from "./widgets/quick-actions";
import { DayAgenda } from "./widgets/day-agenda";
import { UrgentAttentionWidget } from "./widgets/urgent-attention";
import { PendingPaymentsWidget } from "./widgets/pending-payments";
import { WaitingRoomWidget } from "./widgets/waiting-room";
import { formatCLP } from "@/lib/utils/format";
import type {
  TodayAppointment,
  UrgentAttention,
  PendingPayment,
} from "@/app/[clinic]/dashboard/queries";

export function ReceptionistDashboard({
  organization,
  member,
  counts,
  dayRevenue,
  agenda,
  waitingRoom,
  urgent,
  pendingPayments,
}: {
  organization: Organization;
  member: OrganizationMember;
  counts: {
    appointmentsToday: number;
    totalClients: number;
  };
  dayRevenue: number;
  agenda: TodayAppointment[];
  waitingRoom: TodayAppointment[];
  urgent: UrgentAttention;
  pendingPayments: PendingPayment[];
}) {
  const clinicSlug = organization.slug;
  const todayDate = new Date().toISOString().split("T")[0];
  const todayHref = `/${clinicSlug}/appointments?view=day&date=${todayDate}`;
  const pendingTotal = pendingPayments.reduce((s, p) => s + p.total, 0);

  const highlights = `${counts.appointmentsToday} cita${
    counts.appointmentsToday === 1 ? "" : "s"
  } · ${waitingRoom.length} en sala · ${formatCLP(pendingTotal)} por cobrar`;

  return (
    <div className="space-y-8">
      <HeroGreeting
        name={`Hola, ${member.first_name ?? "equipo"}`}
        subtitle={`Operación del día en ${organization.name}`}
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
          title="Citas hoy"
          value={counts.appointmentsToday}
          description="Total del día"
          icon={CalendarDays}
          tone="teal"
          href={todayHref}
          ariaLabel="Ver agenda del día"
        />
        <KpiCard
          title="En sala"
          value={waitingRoom.length}
          description="Atendiéndose"
          icon={Bell}
          tone="amber"
          href={`${todayHref}&status=in_progress`}
          ariaLabel="Ver pacientes en sala"
        />
        <KpiCard
          title="Cobros hoy"
          value={formatCLP(dayRevenue)}
          description="Ingresado"
          icon={DollarSign}
          tone="emerald"
          href={`/${clinicSlug}/billing`}
          ariaLabel="Ver cobros"
        />
        <KpiCard
          title="Clientes"
          value={counts.totalClients}
          description="Total registrados"
          icon={Users}
          tone="rose"
          href={`/${clinicSlug}/clients`}
          ariaLabel="Ver clientes"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <WaitingRoomWidget
            appointments={waitingRoom}
            clinicSlug={clinicSlug}
          />
        </div>
        <div className="lg:col-span-2">
          <UrgentAttentionWidget data={urgent} clinicSlug={clinicSlug} />
        </div>
      </div>

      <DayAgenda
        title="Agenda del día"
        description="Médica y peluquería unificadas"
        appointments={agenda}
        emptyTitle="Sin citas programadas para hoy"
        emptyDescription="Agenda la primera cita del día para empezar."
        emptyAction={{
          label: "Agendar una cita",
          href: `/${clinicSlug}/appointments/new`,
        }}
        clinicSlug={clinicSlug}
        maxHeight
      />

      <PendingPaymentsWidget
        payments={pendingPayments}
        clinicSlug={clinicSlug}
      />
    </div>
  );
}
