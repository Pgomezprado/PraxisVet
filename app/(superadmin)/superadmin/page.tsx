import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarClock,
  HeartPulse,
  PawPrint,
  Sparkles,
  TrendingUp,
  Users,
  UserX,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  requirePlatformAdmin,
  PlatformAdminAccessDenied,
} from "@/lib/superadmin/guards";
import { logSuperadminAction } from "@/lib/superadmin/audit";
import { formatCLP } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Overview = {
  totals: {
    active_clinics: number;
    personal_orgs: number;
    total_tutors: number;
    total_pets: number;
  };
  subscriptions: {
    trial: number;
    active: number;
    past_due: number;
    expired: number;
    cancelled: number;
  };
  trials_expiring_7d: number;
  founders: { closed: number; target: number };
  mrr_clp: number;
  alerts: { zombies_14d: number; team_inactive: number };
};

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "primary" | "founder";
}) {
  const toneCls = {
    default: "border-border/60",
    primary: "border-primary/40 bg-primary/5",
    founder: "border-violet-500/40 bg-violet-500/5",
  }[tone];
  return (
    <Card className={cn(toneCls)}>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
      {sub && (
        <CardContent>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </CardContent>
      )}
    </Card>
  );
}

function StatusPill({
  label,
  value,
  cls,
}: {
  label: string;
  value: number;
  cls: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 transition-colors",
        cls,
      )}
    >
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function FounderProgress({
  closed,
  target,
}: {
  closed: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((closed / target) * 100)) : 0;
  return (
    <div className="mt-3 space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
        <div
          className="h-full rounded-full bg-violet-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {pct}% del programa fundadoras
      </p>
    </div>
  );
}

export default async function SuperadminSummaryPage() {
  let ctx;
  try {
    ctx = await requirePlatformAdmin();
  } catch (err) {
    if (err instanceof PlatformAdminAccessDenied) {
      if (err.reason === "no_user") {
        redirect("/auth/login?redirect=/superadmin");
      }
      if (err.reason === "aal_insufficient" || err.reason === "aal_unknown") {
        redirect("/auth/mfa?redirect=/superadmin");
      }
      redirect("/");
    }
    throw err;
  }

  await logSuperadminAction({
    action: "view_summary",
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
  });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("superadmin_overview");

  if (error) {
    return (
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Resumen</h2>
        <p className="text-sm text-red-400">
          Error cargando resumen: {error.message}
        </p>
      </section>
    );
  }

  const overview = (data ?? null) as Overview | null;

  if (!overview) {
    return (
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Resumen</h2>
        <p className="text-sm text-muted-foreground">Sin datos para mostrar.</p>
      </section>
    );
  }

  const {
    totals,
    subscriptions,
    trials_expiring_7d,
    founders,
    mrr_clp,
    alerts,
  } = overview;

  const zombies = alerts?.zombies_14d ?? 0;
  const teamInactive = alerts?.team_inactive ?? 0;

  return (
    <section className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Resumen</h2>
        <p className="text-sm text-muted-foreground">
          Foto rápida de la plataforma · MRR, fundadoras, trials y alertas
        </p>
      </header>

      {/* Fila 1 — KPIs grandes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={TrendingUp}
          label="MRR fundadoras"
          value={`${formatCLP(mrr_clp)}`}
          sub="CLP / mes"
          tone="primary"
        />
        <Card className="border-violet-500/40 bg-violet-500/5">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
              Fundadoras
            </CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">
              {founders.closed}{" "}
              <span className="text-base font-normal text-muted-foreground">
                / {founders.target}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FounderProgress
              closed={founders.closed}
              target={founders.target}
            />
          </CardContent>
        </Card>
        <KpiCard
          icon={CalendarClock}
          label="Trials activos"
          value={String(subscriptions.trial)}
          sub={
            trials_expiring_7d > 0
              ? `${trials_expiring_7d} vencen en 7 días`
              : "Ninguno vence en 7 días"
          }
        />
        <KpiCard
          icon={Users}
          label="Tutores Hub"
          value={String(totals.total_tutors)}
          sub="tutores sin clínica"
        />
        <KpiCard
          icon={Building2}
          label="Clínicas activas"
          value={String(totals.active_clinics)}
          sub="excluye orgs personales"
        />
      </div>

      {/* Fila 2 — Suscripciones */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Suscripciones
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatusPill
            label="En prueba"
            value={subscriptions.trial}
            cls="border-sky-500/40 bg-sky-500/10 text-sky-300"
          />
          <StatusPill
            label="Activos"
            value={subscriptions.active}
            cls="border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          />
          <StatusPill
            label="Pago pendiente"
            value={subscriptions.past_due}
            cls="border-amber-500/40 bg-amber-500/10 text-amber-300"
          />
          <StatusPill
            label="Expirados"
            value={subscriptions.expired}
            cls="border-red-500/40 bg-red-500/10 text-red-300"
          />
          <StatusPill
            label="Cancelados"
            value={subscriptions.cancelled}
            cls="border-border/60 bg-muted/40 text-muted-foreground"
          />
        </div>
      </div>

      {/* Fila 3 — Alertas */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Alertas
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/superadmin/clinicas"
            className={cn(
              "group rounded-lg border p-4 transition-colors",
              zombies > 0
                ? "border-red-500/40 bg-red-500/5 hover:bg-red-500/10"
                : "border-border/60 bg-card/40 hover:bg-muted/40",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "rounded-md p-2",
                  zombies > 0
                    ? "bg-red-500/20 text-red-400"
                    : "bg-muted/60 text-muted-foreground",
                )}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium">Clínicas zombie</p>
                  <span className="text-2xl font-semibold tabular-nums">
                    {zombies}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sin actividad real en los últimos 14 días.{" "}
                  <span className="opacity-70 group-hover:underline">
                    Ver clínicas →
                  </span>
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/superadmin/clinicas"
            className={cn(
              "group rounded-lg border p-4 transition-colors",
              teamInactive > 0
                ? "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10"
                : "border-border/60 bg-card/40 hover:bg-muted/40",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "rounded-md p-2",
                  teamInactive > 0
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-muted/60 text-muted-foreground",
                )}
              >
                <UserX className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium">Equipo no activado</p>
                  <span className="text-2xl font-semibold tabular-nums">
                    {teamInactive}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Clínicas donde el resto del equipo aún no entra.{" "}
                  <span className="opacity-70 group-hover:underline">
                    Ver clínicas →
                  </span>
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Fila 4 — Totales secundarios */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          icon={HeartPulse}
          label="Total tutores"
          value={String(totals.total_tutors)}
        />
        <KpiCard
          icon={PawPrint}
          label="Total mascotas"
          value={String(totals.total_pets)}
        />
        <KpiCard
          icon={Activity}
          label="Orgs personales"
          value={String(totals.personal_orgs)}
          sub="tutores con cuenta propia"
        />
      </div>
    </section>
  );
}
