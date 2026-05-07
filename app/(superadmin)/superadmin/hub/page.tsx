import Link from "next/link";
import { redirect } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { HeartHandshake } from "lucide-react";

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

type HubRow = {
  org_id: string;
  tutor_name: string | null;
  tutor_email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  pets_count: number;
};

function relativo(iso: string | null): string {
  if (!iso) return "Nunca";
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
}

function absoluto(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "dd-MM-yyyy", { locale: es });
}

export default async function SuperadminHubPage() {
  let ctx;
  try {
    ctx = await requirePlatformAdmin();
  } catch (err) {
    if (err instanceof PlatformAdminAccessDenied) {
      if (err.reason === "no_user") {
        redirect("/auth/login?redirect=/superadmin/hub");
      }
      if (err.reason === "aal_insufficient" || err.reason === "aal_unknown") {
        redirect("/auth/mfa?redirect=/superadmin/hub");
      }
      redirect("/");
    }
    throw err;
  }

  await logSuperadminAction({
    action: "view_tutor_hub",
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
  });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("superadmin_tutor_hub_overview");

  if (error) {
    return (
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Hub del Tutor
        </h2>
        <p className="text-sm text-red-400">
          Error cargando datos: {error.message}
        </p>
      </section>
    );
  }

  const rows = (data ?? []) as HubRow[];

  return (
    <section className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Hub del Tutor
          </h2>
          <p className="text-sm text-muted-foreground">
            Tutores que se inscribieron sin clínica conectada ·{" "}
            {rows.length === 1
              ? "1 tutor"
              : `${rows.length} tutores`}
            {rows.length === 200 ? " (mostrando últimos 200)" : ""}
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-card/40 px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
            <HeartHandshake className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Aún no hay tutores hub
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando alguien se inscriba directamente desde el landing tutor
            aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 bg-card/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tutor</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Último ingreso</TableHead>
                <TableHead className="text-center">Mascotas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const href = `/superadmin/hub/${r.org_id}`;
                return (
                  <TableRow
                    key={r.org_id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                  >
                    <TableCell>
                      <Link href={href} className="block focus:outline-none">
                        <div className="font-medium hover:text-primary">
                          {r.tutor_name?.trim() || "Sin nombre"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.tutor_email ?? "—"}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <Link href={href} className="block">
                        {absoluto(r.created_at)}
                        <div className="text-xs opacity-70">
                          {relativo(r.created_at)}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <Link href={href} className="block">
                        {relativo(r.last_sign_in_at)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      <Link href={href} className="block">
                        {r.pets_count}
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
