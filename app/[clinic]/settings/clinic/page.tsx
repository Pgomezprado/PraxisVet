import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getClinicSettings } from "./actions";
import { ClinicForm } from "@/components/settings/clinic-form";

const planLabels: Record<string, string> = {
  free: "Gratis",
  pro: "Pro",
  enterprise: "Enterprise",
};

export default async function ClinicSettingsPage({
  params,
}: {
  params: Promise<{ clinic: string }>;
}) {
  const { clinic } = await params;

  const result = await getClinicSettings(clinic);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Error al cargar la configuracion: {result.error}
        </div>
      </div>
    );
  }

  const org = result.data;

  const createdAt = new Date(org.created_at).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/${clinic}/settings`}
          className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Configuracion de la clinica
          </h1>
          <p className="text-muted-foreground">
            Administra la informacion general de tu clinica.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ClinicForm organization={org} />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-medium">Informacion del sistema</h3>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Identificador</span>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {org.slug}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <Badge variant="secondary">
                  {planLabels[org.plan] ?? org.plan}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creada el</span>
                <span>{createdAt}</span>
              </div>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              El identificador (slug) no se puede modificar. Se usa en la URL de
              tu clinica.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
