import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  CalendarCheck,
  ChevronRight,
  FileText,
  HeartHandshake,
  PawPrint,
  Smartphone,
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

type TutorHubDetail = {
  org: {
    id: string;
    created_at: string;
    is_personal: boolean;
  };
  tutor: {
    user_id: string | null;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    last_sign_in_at: string | null;
    created_at: string | null;
  } | null;
  pets: Array<{
    id: string;
    name: string;
    species: string | null;
    size: string | null;
    /** Backend devuelve `birthday` (alias de la columna `birthdate` en DB) */
    birthday: string | null;
    created_at: string;
  }>;
  activity: {
    appointments_count: number;
    shared_exams_count: number;
    last_portal_visit: string | null;
  };
};

function relativo(iso: string | null): string {
  if (!iso) return "Nunca";
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
}

function absoluto(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "dd-MM-yyyy", { locale: es });
  } catch {
    return "—";
  }
}

const SPECIES_LABEL: Record<string, string> = {
  canino: "Canino",
  felino: "Felino",
  exotico: "Exótico",
};

const SIZE_LABEL: Record<string, string> = {
  xs: "XS",
  s: "S",
  m: "M",
  l: "L",
  xl: "XL",
};

type PageProps = { params: Promise<{ orgId: string }> };

export default async function SuperadminHubDetailPage({ params }: PageProps) {
  const { orgId } = await params;

  // Guard
  let ctx;
  try {
    ctx = await requirePlatformAdmin();
  } catch (err) {
    if (err instanceof PlatformAdminAccessDenied) {
      if (err.reason === "no_user") {
        redirect(`/auth/login?redirect=/superadmin/hub/${orgId}`);
      }
      if (err.reason === "aal_insufficient" || err.reason === "aal_unknown") {
        redirect(`/auth/mfa?redirect=/superadmin/hub/${orgId}`);
      }
      redirect("/");
    }
    throw err;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("superadmin_tutor_hub_detail", {
    p_org_id: orgId,
  });

  if (error || !data) {
    if (
      error &&
      (/not_personal_org/.test(error.message ?? "") ||
        error.code === "P0002" ||
        /not[_ ]found/.test(error.message ?? ""))
    ) {
      notFound();
    }
    if (error) {
      notFound();
    }
    notFound();
  }

  const detail = data as TutorHubDetail;
  const tutor = detail.tutor;
  const fullName =
    (tutor
      ? [tutor.first_name, tutor.last_name].filter(Boolean).join(" ").trim()
      : "") || "Sin nombre";
  const tutorEmail = tutor?.email ?? null;
  const lastSignIn = tutor?.last_sign_in_at ?? null;

  await logSuperadminAction({
    action: "view_tutor_hub_detail",
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
    orgId,
    metadata: {
      tutor_email: tutorEmail,
      pets_count: detail.pets.length,
    },
  });

  return (
    <section className="space-y-6">
      {/* Breadcrumb + volver */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/superadmin/hub" className="hover:text-foreground">
            Hub del Tutor
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{fullName}</span>
        </nav>
        <Link
          href="/superadmin/hub"
          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al Hub
        </Link>
      </div>

      {/* Cabecera */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">{fullName}</CardTitle>
                <Badge
                  variant="outline"
                  className="border-violet-500/40 bg-violet-500/10 text-violet-400"
                >
                  <HeartHandshake className="mr-1 h-3 w-3" /> Tutor del Hub
                </Badge>
              </div>
              <CardDescription>
                {tutorEmail ?? "Sin correo registrado"}
              </CardDescription>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Registrado {relativo(detail.org.created_at)}</div>
              <div className="opacity-70">
                ({absoluto(detail.org.created_at)})
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Salud de uso */}
      <Card>
        <CardHeader>
          <CardTitle>Salud de uso</CardTitle>
          <CardDescription>
            Señales básicas de actividad de la cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Último ingreso</dt>
              <dd>
                {lastSignIn ? (
                  <>
                    {relativo(lastSignIn)}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({absoluto(lastSignIn)})
                    </span>
                  </>
                ) : (
                  <span className="text-red-400">Nunca</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Cuenta creada
              </dt>
              <dd>
                {relativo(detail.org.created_at)}{" "}
                <span className="text-xs text-muted-foreground">
                  ({absoluto(detail.org.created_at)})
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Mascotas</dt>
              <dd className="font-mono">{detail.pets.length}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Mascotas */}
      <Card>
        <CardHeader>
          <CardTitle>Mascotas</CardTitle>
          <CardDescription>
            {detail.pets.length === 0
              ? "Aún no ha registrado mascotas"
              : `${detail.pets.length} ${detail.pets.length === 1 ? "mascota" : "mascotas"} en su cuenta`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {detail.pets.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted/40">
                <PawPrint className="h-5 w-5 text-muted-foreground" />
              </div>
              Sin mascotas registradas todavía.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Especie</TableHead>
                  <TableHead>Talla</TableHead>
                  <TableHead>Nacimiento</TableHead>
                  <TableHead>Creada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.pets.map((p) => {
                  const speciesKey = (p.species ?? "").toLowerCase();
                  const speciesLabel =
                    SPECIES_LABEL[speciesKey] ?? p.species ?? "—";
                  const sizeKey = (p.size ?? "").toLowerCase();
                  const sizeLabel = sizeKey
                    ? (SIZE_LABEL[sizeKey] ?? p.size ?? "—")
                    : "—";
                  const birth = p.birthday ?? null;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {speciesLabel}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sizeLabel}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {absoluto(birth)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {absoluto(p.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Actividad */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad en clínicas</CardTitle>
          <CardDescription>
            Cómo este tutor está usando PraxisVet con las clínicas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            El bridge tutor ↔ clínica está en desarrollo; estos contadores aún
            se mantienen en 0 hasta que se conecte.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription className="flex items-center gap-1">
                  <CalendarCheck className="h-3.5 w-3.5" /> Citas conectadas
                </CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-nums">
                  {detail.activity.appointments_count}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> Exámenes compartidos
                </CardDescription>
                <CardTitle className="text-3xl font-semibold tabular-nums">
                  {detail.activity.shared_exams_count}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription className="flex items-center gap-1">
                  <Smartphone className="h-3.5 w-3.5" /> Última visita al portal
                </CardDescription>
                <CardTitle className="text-base font-medium">
                  {detail.activity.last_portal_visit
                    ? relativo(detail.activity.last_portal_visit)
                    : "Sin visitas"}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
