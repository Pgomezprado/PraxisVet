import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Info,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import {
  requirePlatformAdmin,
  PlatformAdminAccessDenied,
} from "@/lib/superadmin/guards";
import { logSuperadminAction } from "@/lib/superadmin/audit";

export const dynamic = "force-dynamic";

// ============================================================
// Tipos del payload de `superadmin_org_detail`
// ============================================================
type Identity = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
  phone: string | null;
  address: string | null;
};

type MemberRole = "admin" | "vet" | "receptionist" | "groomer";
type MemberStatus = "active" | "inactive" | "never";

type Member = {
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: MemberRole;
  invited_at: string | null;
  last_sign_in_at: string | null;
  status: MemberStatus;
};

type Activity = {
  consultations_7d: number;
  consultations_30d: number;
  grooming_7d: number;
  grooming_30d: number;
  appointments_7d: number;
  appointments_30d: number;
  new_pets_7d: number;
  new_pets_30d: number;
  prescriptions_7d: number;
  prescriptions_30d: number;
  prescriptions_retained_pct_7d: number;
};

type AdoptionRow = {
  role: MemberRole;
  active_members_7d: number;
  primary_action_label: string;
  primary_action_count: number;
};

type OrgDetail = {
  identity: Identity;
  members: Member[];
  activity: Activity;
  adoption: AdoptionRow[];
};

type BlindSpotSeverity = "ok" | "info" | "warning" | "critical";
type BlindSpot = {
  key: string;
  label: string;
  ok: boolean;
  severity: BlindSpotSeverity;
  detail: string;
};

type DailyPoint = {
  day: string;
  appointments: number;
  consultations: number;
  grooming: number;
  invoices: number;
  new_clients: number;
};

type Trial = {
  plan: string;
  subscription_status: string | null;
  trial_ends_at: string | null;
  days_to_trial_end: number | null;
  founder_since: string | null;
};

type OrgPulse = {
  trial: Trial;
  blind_spots: BlindSpot[];
  daily_activity: DailyPoint[];
  totals: {
    clients_total: number;
    invoices_7d: number;
    invoices_30d: number;
  };
};

// ============================================================
// Helpers de formato
// ============================================================
function relativo(iso: string | null): string {
  if (!iso) return "Nunca";
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
}

function absoluto(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "dd-MM-yyyy", { locale: es });
}

const ROLE_COPY: Record<MemberRole, string> = {
  admin: "Admin",
  vet: "Veterinario",
  receptionist: "Recepcionista",
  groomer: "Peluquero",
};

function RoleBadge({ role }: { role: MemberRole }) {
  const map: Record<MemberRole, string> = {
    admin: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    vet: "border-sky-500/40 bg-sky-500/10 text-sky-400",
    receptionist: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    groomer: "border-violet-500/40 bg-violet-500/10 text-violet-400",
  };
  return (
    <Badge variant="outline" className={map[role]}>
      {ROLE_COPY[role]}
    </Badge>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const variants: Record<string, string> = {
    free: "border-border/60 bg-muted/40 text-muted-foreground",
    pro: "border-primary/40 bg-primary/10 text-primary",
    enterprise: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  };
  return (
    <Badge variant="outline" className={variants[plan] ?? variants.free}>
      {plan}
    </Badge>
  );
}

function StatusDot({ status }: { status: MemberStatus }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-emerald-400">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
        Activo
      </span>
    );
  }
  if (status === "inactive") {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-amber-400">
        <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
        Inactivo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-sm text-red-400">
      <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
      Sin login
    </span>
  );
}

function BlindSpotRow({ spot }: { spot: BlindSpot }) {
  const tone: Record<BlindSpotSeverity, string> = {
    ok: "border-emerald-500/40 bg-emerald-500/5 text-emerald-400",
    info: "border-sky-500/40 bg-sky-500/5 text-sky-400",
    warning: "border-amber-500/40 bg-amber-500/5 text-amber-400",
    critical: "border-red-500/40 bg-red-500/5 text-red-400",
  };
  const Icon =
    spot.severity === "ok"
      ? CheckCircle2
      : spot.severity === "info"
        ? Info
        : AlertTriangle;
  return (
    <div
      className={`flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm ${tone[spot.severity]}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <div className="font-medium text-foreground">{spot.label}</div>
        <div className="text-xs text-muted-foreground">{spot.detail}</div>
      </div>
    </div>
  );
}

function DailySparkline({ series }: { series: DailyPoint[] }) {
  const maxAppt = Math.max(1, ...series.map((d) => d.appointments));
  return (
    <div className="flex items-end gap-1">
      {series.map((d) => {
        const h = Math.round((d.appointments / maxAppt) * 100);
        const empty = d.appointments === 0;
        const dayLabel = format(parseISO(d.day), "dd", { locale: es });
        return (
          <div
            key={d.day}
            className="group flex flex-1 flex-col items-center gap-1"
            title={`${format(parseISO(d.day), "dd-MM-yyyy", { locale: es })}\n${d.appointments} citas · ${d.consultations} consultas · ${d.grooming} peluquería · ${d.invoices} docs · ${d.new_clients} clientes`}
          >
            <div className="flex h-24 w-full items-end">
              <div
                className={`w-full rounded-sm transition-colors ${
                  empty
                    ? "bg-muted/30"
                    : "bg-primary/70 group-hover:bg-primary"
                }`}
                style={{ height: empty ? "4px" : `${Math.max(h, 6)}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {dayLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TrialBadge({ trial }: { trial: Trial }) {
  const isFounder = !!trial.founder_since;
  const days = trial.days_to_trial_end;
  const status = trial.subscription_status ?? "—";

  if (isFounder) {
    return (
      <Badge
        variant="outline"
        className="border-violet-500/40 bg-violet-500/10 text-violet-400"
      >
        Fundadora · desde {trial.founder_since}
      </Badge>
    );
  }
  if (status === "trial" && days !== null) {
    const tone =
      days <= 3
        ? "border-red-500/40 bg-red-500/10 text-red-400"
        : days <= 10
          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
          : "border-sky-500/40 bg-sky-500/10 text-sky-400";
    return (
      <Badge variant="outline" className={tone}>
        Trial · {days}d restantes
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-border/60 bg-muted/40">
      {status}
    </Badge>
  );
}

function StatCard({
  label,
  value7d,
  value30d,
  subtext,
}: {
  label: string;
  value7d: number;
  value30d: number;
  subtext?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums">
          {value7d}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          en 30 días: <span className="tabular-nums">{value30d}</span>
          {subtext ? ` · ${subtext}` : ""}
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Page
// ============================================================
type PageProps = { params: Promise<{ orgId: string }> };

export default async function SuperadminOrgDetailPage({ params }: PageProps) {
  const { orgId } = await params;

  // ---- Guard ----
  let ctx;
  try {
    ctx = await requirePlatformAdmin();
  } catch (err) {
    if (err instanceof PlatformAdminAccessDenied) {
      if (err.reason === "no_user") {
        redirect(`/auth/login?redirect=/superadmin/${orgId}`);
      }
      if (err.reason === "aal_insufficient" || err.reason === "aal_unknown") {
        redirect(`/auth/mfa?redirect=/superadmin/${orgId}`);
      }
      redirect("/");
    }
    throw err;
  }

  // ---- Fetch ----
  const supabase = await createClient();
  const [{ data, error }, { data: pulseData, error: pulseError }] =
    await Promise.all([
      supabase.rpc("superadmin_org_detail", { p_org_id: orgId }),
      supabase.rpc("superadmin_org_pulse", { p_org_id: orgId }),
    ]);

  if (error) {
    if (error.code === "P0002" || /org_not_found/.test(error.message ?? "")) {
      notFound();
    }
    return (
      <section className="space-y-4">
        <Link
          href="/superadmin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <p className="text-sm text-red-400">
          Error cargando detalle: {error.message}
        </p>
      </section>
    );
  }

  const detail = data as OrgDetail;
  const pulse = (pulseError ? null : (pulseData as OrgPulse | null)) ?? null;

  // ---- Audit log ----
  await logSuperadminAction({
    action: "view_org_detail",
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
    orgId,
    metadata: { org_name: detail.identity.name },
  });

  const { identity, members, activity, adoption } = detail;

  return (
    <section className="space-y-6">
      {/* Breadcrumb + volver */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/superadmin" className="hover:text-foreground">
            Superadmin
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{identity.name}</span>
        </nav>
        <Link
          href="/superadmin"
          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
      </div>

      {/* Bloque A — Identidad */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{identity.name}</CardTitle>
              <CardDescription>
                praxisvet.cl/{identity.slug}
              </CardDescription>
            </div>
            <PlanBadge plan={identity.plan} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Creación</dt>
              <dd>
                {relativo(identity.created_at)}{" "}
                <span className="text-xs text-muted-foreground">
                  ({absoluto(identity.created_at)})
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Teléfono</dt>
              <dd>{identity.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Dirección</dt>
              <dd>{identity.address || "—"}</dd>
            </div>
          </dl>
          <div>
            <button
              type="button"
              disabled
              title="Disponible próximamente — requiere consentimiento del cliente"
              className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground opacity-60"
            >
              Ver como Admin
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Bloque A.2 — Pulso del piloto (blind spots + timeline 14d) */}
      {pulse && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>Puntos ciegos del piloto</CardTitle>
                  <CardDescription>
                    Features no activadas y riesgos detectados automáticamente
                  </CardDescription>
                </div>
                <TrialBadge trial={pulse.trial} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {pulse.blind_spots.map((s) => (
                  <BlindSpotRow key={s.key} spot={s} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pulso de uso · últimos 14 días</CardTitle>
              <CardDescription>
                Citas por día. Pasa el mouse por una barra para el desglose.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DailySparkline series={pulse.daily_activity} />
              <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Clientes totales</dt>
                  <dd className="font-mono text-sm">{pulse.totals.clients_total}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Docs emitidos 7d</dt>
                  <dd className="font-mono text-sm">{pulse.totals.invoices_7d}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Docs emitidos 30d</dt>
                  <dd className="font-mono text-sm">{pulse.totals.invoices_30d}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Días con actividad</dt>
                  <dd className="font-mono text-sm">
                    {
                      pulse.daily_activity.filter((d) => d.appointments > 0)
                        .length
                    }
                    /14
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </>
      )}

      {/* Bloque B — Equipo */}
      <Card>
        <CardHeader>
          <CardTitle>Equipo</CardTitle>
          <CardDescription>
            {members.length}{" "}
            {members.length === 1 ? "miembro activo" : "miembros activos"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Sin miembros activos.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Invitado</TableHead>
                  <TableHead>Último login</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const fullName = [m.first_name, m.last_name]
                    .filter(Boolean)
                    .join(" ") || "—";
                  return (
                    <TableRow key={m.user_id ?? `${m.email}-${m.role}`}>
                      <TableCell className="font-medium">{fullName}</TableCell>
                      <TableCell>
                        <RoleBadge role={m.role} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {relativo(m.invited_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.last_sign_in_at ? (
                          <span className="text-muted-foreground">
                            {relativo(m.last_sign_in_at)}
                          </span>
                        ) : (
                          <span className="text-red-400">Nunca entró</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusDot status={m.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bloque C — Actividad */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad</CardTitle>
          <CardDescription>
            Volumen de uso en los últimos 7 días (comparado con 30d)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Consultas médicas"
              value7d={activity.consultations_7d}
              value30d={activity.consultations_30d}
            />
            <StatCard
              label="Servicios peluquería"
              value7d={activity.grooming_7d}
              value30d={activity.grooming_30d}
            />
            <StatCard
              label="Citas agendadas"
              value7d={activity.appointments_7d}
              value30d={activity.appointments_30d}
            />
            <StatCard
              label="Pacientes nuevos"
              value7d={activity.new_pets_7d}
              value30d={activity.new_pets_30d}
            />
            <StatCard
              label="Recetas"
              value7d={activity.prescriptions_7d}
              value30d={activity.prescriptions_30d}
              subtext={`${activity.prescriptions_retained_pct_7d}% retenidas`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bloque D — Adopción por rol */}
      <Card>
        <CardHeader>
          <CardTitle>Adopción por rol</CardTitle>
          <CardDescription>
            Actividad de cada rol en los últimos 7 días
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rol</TableHead>
                <TableHead className="text-center">Miembros activos 7d</TableHead>
                <TableHead>Acción principal</TableHead>
                <TableHead className="text-center">Volumen 7d</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adoption.map((row) => (
                <TableRow key={row.role}>
                  <TableCell>
                    <RoleBadge role={row.role} />
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {row.active_members_7d}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.primary_action_label}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {row.primary_action_count}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
