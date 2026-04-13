import {
  CalendarDays,
  Users,
  DollarSign,
  PawPrint,
  Clock,
  UserPlus,
  CheckCircle2,
  Circle,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
import type { AppointmentStatus } from "@/types/database";

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "justo ahora";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return "hace 1 día";
  if (diffDays < 30) return `hace ${diffDays} días`;
  if (diffDays < 365) return `hace ${Math.floor(diffDays / 30)} meses`;
  return `hace ${Math.floor(diffDays / 365)} años`;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${suffix}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

const statusConfig: Record<
  AppointmentStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pendiente", variant: "outline" },
  confirmed: { label: "Confirmada", variant: "default" },
  in_progress: { label: "En curso", variant: "secondary" },
  ready_for_pickup: { label: "Listo para retiro", variant: "secondary" },
  completed: { label: "Completada", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  no_show: { label: "No asistió", variant: "destructive" },
};

type StatColor = "teal" | "amber" | "emerald" | "rose";

type StatCardData = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  color: StatColor;
};

const statColorClasses: Record<
  StatColor,
  { bg: string; text: string; border: string }
> = {
  teal: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-l-primary",
  },
  amber: {
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-l-orange-500",
  },
  emerald: {
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-l-sky-500",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-l-rose-500",
  },
};

function StatCard({ stat }: { stat: StatCardData }) {
  const colors = statColorClasses[stat.color];
  const Icon = stat.icon;

  return (
    <Card className={`border-l-4 ${colors.border}`}>
      <CardContent className="flex items-center gap-4 py-5">
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${colors.bg}`}
        >
          <Icon className={`size-6 ${colors.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">
            {stat.title}
          </p>
          <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {stat.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ clinic: string }>;
}) {
  const { clinic } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", clinic)
    .single();

  if (!org) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">No se encontró la organización.</p>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const monthStart = `${today.slice(0, 7)}-01`;

  const [
    { count: appointmentsToday },
    { count: clientsCount },
    { data: invoiceData },
    { count: petsCount },
    { data: todayAppointments },
    { data: recentClients },
    { count: servicesCount },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("org_id", org.id)
      .eq("date", today),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("org_id", org.id),
    supabase
      .from("invoices")
      .select("total")
      .eq("org_id", org.id)
      .eq("status", "paid")
      .gte("created_at", monthStart)
      .lte("created_at", `${today}T23:59:59`),
    supabase
      .from("pets")
      .select("*", { count: "exact", head: true })
      .eq("org_id", org.id),
    supabase
      .from("appointments")
      .select(
        `
        id,
        date,
        start_time,
        status,
        reason,
        pets ( name ),
        clients ( first_name, last_name ),
        organization_members!appointments_assigned_to_fkey ( first_name, last_name )
      `
      )
      .eq("org_id", org.id)
      .eq("date", today)
      .order("start_time", { ascending: true })
      .limit(10),
    supabase
      .from("clients")
      .select("id, first_name, last_name, created_at")
      .eq("org_id", org.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("services")
      .select("*", { count: "exact", head: true })
      .eq("org_id", org.id),
  ]);

  const monthlyRevenue =
    invoiceData?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) ?? 0;

  const todayLabel = format(new Date(), "EEEE d 'de' MMMM", { locale: es });
  const monthLabel = format(new Date(), "MMMM 'de' yyyy", { locale: es });
  const citasHoy = appointmentsToday ?? 0;
  const totalClients = clientsCount ?? 0;
  const totalPets = petsCount ?? 0;
  const totalServices = servicesCount ?? 0;

  const statCards: StatCardData[] = [
    {
      title: "Citas hoy",
      value: String(citasHoy),
      icon: CalendarDays,
      description: todayLabel,
      color: "teal",
    },
    {
      title: "Clientes",
      value: String(totalClients),
      icon: Users,
      description: "Total registrados",
      color: "amber",
    },
    {
      title: "Ingresos del mes",
      value: `$${monthlyRevenue.toLocaleString("es-CL")}`,
      icon: DollarSign,
      description: monthLabel,
      color: "emerald",
    },
    {
      title: "Mascotas",
      value: String(totalPets),
      icon: PawPrint,
      description: "Total registradas",
      color: "rose",
    },
  ];

  const onboardingSteps = [
    {
      label: "Configura los servicios que ofrece tu clínica",
      href: `/${clinic}/settings/services`,
      completed: totalServices > 0,
    },
    {
      label: "Registra a tu primer cliente y su mascota",
      href: `/${clinic}/clients`,
      completed: totalClients > 0,
    },
    {
      label: "Agenda tu primera cita",
      href: `/${clinic}/appointments`,
      completed: citasHoy > 0,
    },
    {
      label: "Configura tu equipo y ajustes generales",
      href: `/${clinic}/settings`,
      completed: false,
    },
  ];
  const completedSteps = onboardingSteps.filter((s) => s.completed).length;
  const showOnboarding = completedSteps < onboardingSteps.length;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="rounded-2xl border bg-linear-to-br from-primary/10 via-primary/5 to-transparent px-6 py-7">
        <p className="text-sm font-medium text-primary">{getGreeting()}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          {org.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground capitalize">
          {todayLabel} · {citasHoy === 0
            ? "sin citas programadas"
            : `${citasHoy} cita${citasHoy > 1 ? "s" : ""} programada${citasHoy > 1 ? "s" : ""}`}
        </p>
      </section>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard key={stat.title} stat={stat} />
        ))}
      </div>

      {/* Citas de hoy + Actividad reciente */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Citas de hoy — protagonista */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-primary" />
                <CardTitle className="text-base font-semibold">
                  Citas de hoy
                </CardTitle>
              </div>
              {todayAppointments && todayAppointments.length > 0 && (
                <Link href={`/${clinic}/appointments`}>
                  <Button variant="ghost" size="sm">
                    Ver todas
                    <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              )}
            </div>
            <CardDescription>
              {todayAppointments && todayAppointments.length > 0
                ? `${todayAppointments.length} cita${todayAppointments.length > 1 ? "s" : ""} programada${todayAppointments.length > 1 ? "s" : ""}`
                : "Empieza tu día con la agenda al día"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!todayAppointments || todayAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-primary/5 py-10 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <CalendarDays className="size-7 text-primary" />
                </div>
                <p className="text-sm font-medium">
                  Sin citas programadas para hoy
                </p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Cuando agendes una cita, aparecerá aquí lista para iniciar la consulta.
                </p>
                <Link
                  href={`/${clinic}/appointments/new`}
                  className="mt-4"
                >
                  <Button size="sm">
                    <CalendarDays className="size-3.5" />
                    Agendar una cita
                  </Button>
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {todayAppointments.map((apt) => {
                  const pet = apt.pets as unknown as { name: string } | null;
                  const client = apt.clients as unknown as {
                    first_name: string;
                    last_name: string;
                  } | null;
                  const vet = apt.organization_members as unknown as {
                    first_name: string | null;
                    last_name: string | null;
                  } | null;
                  const status =
                    statusConfig[apt.status as AppointmentStatus] ??
                    statusConfig.pending;

                  return (
                    <li key={apt.id}>
                      <Link
                        href={`/${clinic}/appointments/${apt.id}`}
                        className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 hover:border-primary/40"
                      >
                        <div className="flex items-center gap-3">
                          <span className="min-w-18 text-sm font-semibold tabular-nums text-primary">
                            {formatTime(apt.start_time)}
                          </span>
                          <div>
                            <p className="text-sm font-medium">
                              {pet?.name ?? "Sin mascota"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {client
                                ? `${client.first_name} ${client.last_name}`
                                : "Sin cliente"}
                              {vet
                                ? ` · ${vet.first_name ?? ""} ${vet.last_name ?? ""}`.trim()
                                : ""}
                            </p>
                          </div>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Actividad reciente */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="size-5 text-orange-600 dark:text-orange-400" />
              <CardTitle className="text-base font-semibold">
                Actividad reciente
              </CardTitle>
            </div>
            <CardDescription>Últimos clientes registrados</CardDescription>
          </CardHeader>
          <CardContent>
            {!recentClients || recentClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-orange-500/5 py-10 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-orange-500/10">
                  <Users className="size-7 text-orange-600 dark:text-orange-400" />
                </div>
                <p className="text-sm font-medium">
                  Aún no hay clientes registrados
                </p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Empieza creando la ficha de tu primer cliente.
                </p>
                <Link href={`/${clinic}/clients/new`} className="mt-4">
                  <Button size="sm" variant="outline">
                    <UserPlus className="size-3.5" />
                    Registrar cliente
                  </Button>
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {recentClients.map((client) => (
                  <li key={client.id}>
                    <Link
                      href={`/${clinic}/clients/${client.id}`}
                      className="flex items-center justify-between rounded-lg p-2.5 transition-colors hover:bg-muted/50"
                    >
                      <p className="text-sm font-medium">
                        {client.first_name} {client.last_name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(client.created_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Próximos pasos — checklist con progreso */}
      {showOnboarding && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold">
                  Próximos pasos
                </CardTitle>
                <CardDescription>
                  Configura tu clínica para aprovechar todas las funcionalidades.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {completedSteps} / {onboardingSteps.length}
              </Badge>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${(completedSteps / onboardingSteps.length) * 100}%`,
                }}
              />
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {onboardingSteps.map((step) => (
                <li key={step.href}>
                  <Link
                    href={step.href}
                    className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 hover:border-primary/40"
                  >
                    {step.completed ? (
                      <CheckCircle2 className="size-5 shrink-0 text-primary" />
                    ) : (
                      <Circle className="size-5 shrink-0 text-muted-foreground/50" />
                    )}
                    <span
                      className={
                        step.completed
                          ? "flex-1 text-sm text-muted-foreground line-through"
                          : "flex-1 text-sm"
                      }
                    >
                      {step.label}
                    </span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
