import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { listPortalLinks, type PortalLinkRow } from "./actions";
import { PortalLinkActions } from "./_components/portal-link-actions";

const STATUS_CONFIG: Record<
  PortalLinkRow["status"],
  { label: string; className: string }
> = {
  linked: {
    label: "Activo",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  pending: {
    label: "Invitado",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  expired: {
    label: "Expirado",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  revoked: {
    label: "Revocado",
    className:
      "bg-gray-200 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400",
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDateOnly(iso: string | null): string {
  if (!iso) return "Sin expiración";
  return new Date(iso).toLocaleDateString("es-CL", { dateStyle: "medium" });
}

export default async function PortalSettingsPage({
  params,
}: {
  params: Promise<{ clinic: string }>;
}) {
  const { clinic } = await params;
  const result = await listPortalLinks(clinic);

  if (!result.success) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href={`/${clinic}/settings`}>
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Portal del tutor
          </h1>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {result.error}
          </CardContent>
        </Card>
      </div>
    );
  }

  const links = result.data;
  const summary = {
    active: links.filter((l) => l.status === "linked").length,
    pending: links.filter((l) => l.status === "pending").length,
    revoked: links.filter((l) => l.status === "revoked").length,
    expired: links.filter((l) => l.status === "expired").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${clinic}/settings`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Portal del tutor
          </h1>
          <p className="text-sm text-muted-foreground">
            Controla quién tiene acceso al portal de tutores y su historial.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Cómo funciona</CardTitle>
              <CardDescription>
                Las invitaciones al portal se envían desde la ficha de cada
                cliente. Aquí puedes revocar accesos, definir una expiración o
                revisar el historial de cada acceso.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Activos</p>
            <p className="text-2xl font-bold text-green-600">
              {summary.active}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Invitados</p>
            <p className="text-2xl font-bold text-blue-600">
              {summary.pending}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Expirados</p>
            <p className="text-2xl font-bold text-amber-600">
              {summary.expired}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Revocados</p>
            <p className="text-2xl font-bold text-gray-500">
              {summary.revoked}
            </p>
          </CardContent>
        </Card>
      </div>

      {links.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aún no hay invitaciones al portal del tutor. Invita a un tutor desde
            la ficha de un cliente con email registrado.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último acceso</TableHead>
                  <TableHead>Expiración</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => {
                  const config = STATUS_CONFIG[link.status];
                  return (
                    <TableRow key={link.id}>
                      <TableCell>
                        <Link
                          href={`/${clinic}/clients/${link.client_id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {link.client_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {link.email}
                      </TableCell>
                      <TableCell>
                        <Badge className={config.className}>
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(link.last_accessed_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateOnly(link.expires_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <PortalLinkActions
                          link={link}
                          clinicSlug={clinic}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
