import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Star } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import {
  requirePlatformAdmin,
  PlatformAdminAccessDenied,
} from "@/lib/superadmin/guards";
import { logSuperadminAction } from "@/lib/superadmin/audit";
import { ClinicsFilters } from "../_components/ClinicsFilters";
import { ClinicsExportButton } from "../_components/ClinicsExportButton";

type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "expired"
  | "cancelled"
  | null;

type ClinicRow = {
  org_id: string;
  org_name: string;
  org_slug: string;
  org_plan: string;
  org_created_at: string;
  total_members: number;
  active_members_7d: number;
  last_sign_in_at: string | null;
  consultations_7d: number;
  pets_count: number;
  alert_level: "zombie" | "team_inactive" | "ok";
  // Nuevas Ola 1
  tutors_count: number;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  is_founder: boolean;
};

export const dynamic = "force-dynamic";

function relativo(iso: string | null): string {
  if (!iso) return "Nunca";
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
}

function AlertBadge({ level }: { level: ClinicRow["alert_level"] }) {
  if (level === "zombie") {
    return (
      <Badge
        variant="outline"
        className="border-red-500/40 bg-red-500/10 text-red-400"
      >
        <span className="mr-1">●</span>Zombie
      </Badge>
    );
  }
  if (level === "team_inactive") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/40 bg-amber-500/10 text-amber-400"
      >
        <span className="mr-1">●</span>Equipo no activado
      </Badge>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

function PlanBadge({ plan }: { plan: string }) {
  const variants: Record<string, string> = {
    basico: "border-border/60 bg-muted/40 text-muted-foreground",
    free: "border-border/60 bg-muted/40 text-muted-foreground",
    pro: "border-primary/40 bg-primary/10 text-primary",
    enterprise: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  };
  return (
    <Badge variant="outline" className={variants[plan] ?? variants.basico}>
      {plan}
    </Badge>
  );
}

function SubscriptionBadge({ status }: { status: SubscriptionStatus }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const map: Record<string, { label: string; cls: string }> = {
    trial: {
      label: "En prueba",
      cls: "border-sky-500/40 bg-sky-500/10 text-sky-400",
    },
    active: {
      label: "Activo",
      cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    },
    past_due: {
      label: "Pago pendiente",
      cls: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    },
    expired: {
      label: "Expirado",
      cls: "border-red-500/40 bg-red-500/10 text-red-400",
    },
    cancelled: {
      label: "Cancelado",
      cls: "border-border/60 bg-muted/40 text-muted-foreground",
    },
  };
  const item = map[status] ?? {
    label: status,
    cls: "border-border/60 bg-muted/40 text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={item.cls}>
      {item.label}
    </Badge>
  );
}

type SearchParams = Promise<{
  status?: string;
  plan?: string;
  risk?: string;
  founder?: string;
  q?: string;
}>;

export default async function SuperadminClinicsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const fStatus = (sp.status ?? "").trim();
  const fPlan = (sp.plan ?? "").trim();
  const fRisk = (sp.risk ?? "").trim();
  const fFounder = (sp.founder ?? "").trim();
  const fQ = (sp.q ?? "").trim().toLowerCase();

  let ctx;
  try {
    ctx = await requirePlatformAdmin();
  } catch (err) {
    if (err instanceof PlatformAdminAccessDenied) {
      if (err.reason === "no_user") {
        redirect("/auth/login?redirect=/superadmin/clinicas");
      }
      if (err.reason === "aal_insufficient" || err.reason === "aal_unknown") {
        redirect("/auth/mfa?redirect=/superadmin/clinicas");
      }
      redirect("/");
    }
    throw err;
  }

  await logSuperadminAction({
    action: "view_clinics_list",
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
  });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("superadmin_clinics_overview");

  if (error) {
    return (
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Clínicas</h2>
        <p className="text-sm text-red-400">
          Error cargando datos: {error.message}
        </p>
      </section>
    );
  }

  const allRows = (data ?? []) as ClinicRow[];
  const rows = allRows.filter((r) => {
    if (fStatus && r.subscription_status !== fStatus) return false;
    if (fPlan && r.org_plan !== fPlan) return false;
    if (fRisk && r.alert_level !== fRisk) return false;
    if (fFounder === "yes" && !r.is_founder) return false;
    if (fFounder === "no" && r.is_founder) return false;
    if (fQ) {
      const name = (r.org_name ?? "").toLowerCase();
      const slug = (r.org_slug ?? "").toLowerCase();
      if (!name.includes(fQ) && !slug.includes(fQ)) return false;
    }
    return true;
  });

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Clínicas</h2>
          <p className="text-sm text-muted-foreground">
            {allRows.length}{" "}
            {allRows.length === 1 ? "clínica" : "clínicas"} en la plataforma ·
            ordenadas por alerta y último login
          </p>
        </div>
      </div>

      <ClinicsFilters
        total={allRows.length}
        filtered={rows.length}
        exportSlot={<ClinicsExportButton rows={rows} />}
      />

      {allRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-card/40 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Todavía no hay clínicas registradas.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-card/40 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Ninguna clínica coincide con los filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 bg-card/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clínica</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creación</TableHead>
                <TableHead>Último login</TableHead>
                <TableHead className="text-center">Usuarios 7d</TableHead>
                <TableHead className="text-center">Consultas 7d</TableHead>
                <TableHead className="text-center">Pacientes</TableHead>
                <TableHead className="text-center">Tutores</TableHead>
                <TableHead>Alerta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const href = `/superadmin/clinicas/${r.org_id}`;
                return (
                  <TableRow
                    key={r.org_id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                  >
                    <TableCell>
                      <Link href={href} className="block focus:outline-none">
                        <div className="flex items-center gap-2 font-medium hover:text-primary">
                          {r.org_name}
                          {r.is_founder && (
                            <span
                              title="Clínica fundadora"
                              className="inline-flex items-center gap-0.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-400"
                            >
                              <Star className="h-2.5 w-2.5" />
                              Fundadora
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          /{r.org_slug}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={href} className="block">
                        <PlanBadge plan={r.org_plan} />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={href} className="block">
                        <SubscriptionBadge status={r.subscription_status} />
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <Link href={href} className="block">
                        {relativo(r.org_created_at)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <Link href={href} className="block">
                        {relativo(r.last_sign_in_at)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      <Link href={href} className="block">
                        {r.active_members_7d}/{r.total_members}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      <Link href={href} className="block">
                        {r.consultations_7d}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      <Link href={href} className="block">
                        {r.pets_count}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      <Link href={href} className="block">
                        {r.tutors_count}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={href} className="block">
                        <AlertBadge level={r.alert_level} />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
