import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, ChevronRight } from "lucide-react";

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
  const { data, error } = await supabase.rpc("superadmin_org_detail", {
    p_org_id: orgId,
  });

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
