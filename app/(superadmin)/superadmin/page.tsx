import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
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

export default async function SuperadminPage() {
  // ---- Guard estricto con MFA + AAL2 ----
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

  // ---- Audit log (best-effort) ----
  await logSuperadminAction({
    action: "view_overview",
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
  });

  // ---- Fetch ----
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

  const rows = (data ?? []) as ClinicRow[];

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Clínicas</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? "clínica" : "clínicas"} en la
            plataforma · ordenadas por alerta y último login
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-card/40 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Todavía no hay clínicas registradas.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 bg-card/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clínica</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Creación</TableHead>
                <TableHead>Último login</TableHead>
                <TableHead className="text-center">Usuarios 7d</TableHead>
                <TableHead className="text-center">Consultas 7d</TableHead>
                <TableHead className="text-center">Pacientes</TableHead>
                <TableHead>Alerta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow
                  key={r.org_id}
                  className="cursor-pointer transition-colors hover:bg-muted/40"
                >
                  <TableCell>
                    <Link
                      href={`/superadmin/${r.org_id}`}
                      className="block focus:outline-none"
                    >
                      <div className="font-medium hover:text-primary">
                        {r.org_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        /{r.org_slug}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/superadmin/${r.org_id}`} className="block">
                      <PlanBadge plan={r.org_plan} />
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <Link href={`/superadmin/${r.org_id}`} className="block">
                      {relativo(r.org_created_at)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <Link href={`/superadmin/${r.org_id}`} className="block">
                      {relativo(r.last_sign_in_at)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    <Link href={`/superadmin/${r.org_id}`} className="block">
                      {r.active_members_7d}/{r.total_members}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    <Link href={`/superadmin/${r.org_id}`} className="block">
                      {r.consultations_7d}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    <Link href={`/superadmin/${r.org_id}`} className="block">
                      {r.pets_count}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/superadmin/${r.org_id}`} className="block">
                      <AlertBadge level={r.alert_level} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
