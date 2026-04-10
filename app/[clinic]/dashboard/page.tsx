import {
  CalendarDays,
  Users,
  DollarSign,
  PawPrint,
  ArrowRight,
  Clock,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  if (diffDays === 1) return "hace 1 dia";
  if (diffDays < 30) return `hace ${diffDays} dias`;
  if (diffDays < 365) return `hace ${Math.floor(diffDays / 30)} meses`;
  return `hace ${Math.floor(diffDays / 365)} anos`;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${suffix}`;
}

const statusConfig: Record<
  AppointmentStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pendiente", variant: "outline" },
  confirmed: { label: "Confirmada", variant: "default" },
  in_progress: { label: "En curso", variant: "secondary" },
  completed: { label: "Completada", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  no_show: { label: "No asistio", variant: "destructive" },
};

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
        <p className="text-muted-foreground">No se encontro la organizacion.</p>
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
        organization_members!appointments_vet_id_fkey ( first_name, last_name )
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
  ]);

  const monthlyRevenue =
    invoiceData?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) ?? 0;

  const statCards = [
    {
      title: "Citas hoy",
      value: String(appointmentsToday ?? 0),
      icon: CalendarDays,
      description: today,
    },
    {
      title: "Clientes",
      value: String(clientsCount ?? 0),
      icon: Users,
      description: "Total registrados",
    },
    {
      title: "Ingresos del mes",
      value: `$${monthlyRevenue.toLocaleString("es-MX")}`,
      icon: DollarSign,
      description: new Date().toLocaleString("es-MX", {
        month: "long",
        year: "numeric",
      }),
    },
    {
      title: "Mascotas",
      value: String(petsCount ?? 0),
      icon: PawPrint,
      description: "Total registradas",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bienvenido a {org.name}
        </h1>
        <p className="text-muted-foreground">
          Aqui tienes un resumen de tu clinica.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
              <CardDescription className="text-xs">
                {stat.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Citas de hoy */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <CardTitle>Citas de hoy</CardTitle>
            </div>
            <CardDescription>
              {todayAppointments && todayAppointments.length > 0
                ? `${todayAppointments.length} cita${todayAppointments.length > 1 ? "s" : ""} programada${todayAppointments.length > 1 ? "s" : ""}`
                : "Sin citas programadas"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!todayAppointments || todayAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarDays className="mb-3 size-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No hay citas programadas para hoy.
                </p>
                <Link
                  href={`/${clinic}/appointments`}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Agendar una cita
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
                        className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium tabular-nums text-muted-foreground">
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
                                ? ` — Dr. ${vet.first_name ?? ""} ${vet.last_name ?? ""}`.trim()
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
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="size-4 text-muted-foreground" />
              <CardTitle>Actividad reciente</CardTitle>
            </div>
            <CardDescription>Ultimos clientes registrados</CardDescription>
          </CardHeader>
          <CardContent>
            {!recentClients || recentClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="mb-3 size-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Aun no hay clientes registrados.
                </p>
                <Link
                  href={`/${clinic}/clients`}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Registrar cliente
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentClients.map((client) => (
                  <li key={client.id}>
                    <Link
                      href={`/${clinic}/clients/${client.id}`}
                      className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted/50"
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

      {/* Proximos pasos */}
      <Card>
        <CardHeader>
          <CardTitle>Proximos pasos</CardTitle>
          <CardDescription>
            Configura tu clinica para aprovechar todas las funcionalidades.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li>
              <Link
                href={`/${clinic}/settings/services`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowRight className="size-3.5" />
                Configura los servicios que ofrece tu clinica
              </Link>
            </li>
            <li>
              <Link
                href={`/${clinic}/settings/staff`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowRight className="size-3.5" />
                Invita a tu equipo (veterinarios y recepcionistas)
              </Link>
            </li>
            <li>
              <Link
                href={`/${clinic}/clients`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowRight className="size-3.5" />
                Registra a tu primer cliente y su mascota
              </Link>
            </li>
            <li>
              <Link
                href={`/${clinic}/appointments`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowRight className="size-3.5" />
                Agenda tu primera cita
              </Link>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
