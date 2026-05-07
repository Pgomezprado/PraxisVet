import { redirect } from "next/navigation";
import { TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  PlatformAdminAccessDenied,
  requirePlatformAdmin,
} from "@/lib/superadmin/guards";
import { logSuperadminAction } from "@/lib/superadmin/audit";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type FunnelStage = {
  key: string;
  label: string;
  count: number;
};

type FunnelOverview = {
  stages: FunnelStage[];
  rates: {
    signup_to_trial: number | null;
    trial_to_paid: number | null;
    paid_to_founder: number | null;
  };
};

const STAGE_TONES: Record<string, string> = {
  tutors_hub: "bg-sky-500/70",
  signups: "bg-primary/70",
  trial_active: "bg-amber-500/70",
  paid: "bg-emerald-500/70",
  founders: "bg-violet-500/70",
};

function formatPct(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function RateCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | null;
  detail: string;
}) {
  const display = formatPct(value);
  const isEmpty = value === null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs">{label}</CardDescription>
        <CardTitle
          className={cn(
            "text-3xl font-semibold tabular-nums",
            isEmpty && "text-muted-foreground",
          )}
          title={isEmpty ? "Sin datos suficientes" : undefined}
        >
          {display}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function FunnelBars({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  return (
    <div className="space-y-3">
      {stages.map((s) => {
        const pct = Math.round((s.count / max) * 100);
        const tone = STAGE_TONES[s.key] ?? "bg-primary/70";
        return (
          <div key={s.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium">{s.label}</span>
              <span className="font-mono text-xl tabular-nums">{s.count}</span>
            </div>
            <div className="h-8 w-full overflow-hidden rounded-md bg-muted/30">
              <div
                className={cn("h-full rounded-md transition-all", tone)}
                style={{ width: `${Math.max(pct, s.count > 0 ? 4 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function SuperadminFunnelPage() {
  let ctx;
  try {
    ctx = await requirePlatformAdmin();
  } catch (err) {
    if (err instanceof PlatformAdminAccessDenied) {
      if (err.reason === "no_user") {
        redirect("/auth/login?redirect=/superadmin/embudo");
      }
      if (err.reason === "aal_insufficient" || err.reason === "aal_unknown") {
        redirect("/auth/mfa?redirect=/superadmin/embudo");
      }
      redirect("/");
    }
    throw err;
  }

  await logSuperadminAction({
    action: "view_funnel",
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
  });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("superadmin_funnel_overview");

  if (error) {
    return (
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Embudo & Ventas
        </h2>
        <p className="text-sm text-red-400">
          Error cargando embudo: {error.message}
        </p>
      </section>
    );
  }

  const overview = (data ?? null) as FunnelOverview | null;

  if (!overview) {
    return (
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Embudo & Ventas
        </h2>
        <p className="text-sm text-muted-foreground">Sin datos para mostrar.</p>
      </section>
    );
  }

  const { stages, rates } = overview;

  return (
    <section className="space-y-8">
      <header>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">
            Embudo & Ventas
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Cómo avanzan los tutores y clínicas desde el primer registro hasta
          convertirse en fundadoras pagando.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Embudo</CardTitle>
          <CardDescription>
            Volumen actual en cada etapa del journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FunnelBars stages={stages} />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tasas de conversión
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <RateCard
            label="Registro → Trial"
            value={rates.signup_to_trial}
            detail="Clínicas que pasan de registrarse a iniciar trial"
          />
          <RateCard
            label="Trial → Pago"
            value={rates.trial_to_paid}
            detail="Clínicas que convierten su trial en suscripción pagada"
          />
          <RateCard
            label="Pago → Fundadora"
            value={rates.paid_to_founder}
            detail="Pagadas que entraron al programa fundadoras"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Las tasas se calculan sobre el total actual de cada etapa. Si una
          etapa origen tiene 0, la tasa aparece como “—”.
        </p>
      </div>
    </section>
  );
}
