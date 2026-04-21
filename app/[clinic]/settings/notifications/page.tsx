import Link from "next/link";
import { ArrowLeft, MessageCircle, Users } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WhatsAppToggle } from "./_components/whatsapp-toggle";
import { getNotificationSettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function NotificationsSettingsPage({
  params,
}: {
  params: Promise<{ clinic: string }>;
}) {
  const { clinic } = await params;
  const result = await getNotificationSettings(clinic);

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      </div>
    );
  }

  const data = result.data;

  const canEnable = data.providerConfigured;
  const disabledReason = !canEnable
    ? "WhatsApp aún no está conectado en esta instalación. Contacta a PraxisVet para activarlo."
    : undefined;

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
          <h1 className="text-2xl font-bold tracking-tight">Notificaciones</h1>
          <p className="text-muted-foreground">
            Recordatorios automáticos para tus clientes.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageCircle className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>
                Recordatorios de citas 24 horas antes y avisos de próximas
                vacunaciones al tutor.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <WhatsAppToggle
            clinicSlug={clinic}
            initialEnabled={data.whatsappRemindersEnabled}
            disabled={!canEnable}
            disabledReason={disabledReason}
          />

          <Separator />

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label="Clientes con teléfono válido"
              value={data.clientsWithValidPhone}
              hint="Formato chileno +56 9 XXXX XXXX"
            />
            <StatCard
              label="Clientes que aceptaron recibir"
              value={data.clientsOptedIn}
              hint="Opt-in activo en ficha"
            />
          </div>

          <div className="rounded-md border border-dashed bg-muted/30 p-4">
            <p className="text-sm font-medium">¿Cómo funciona?</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>
                Solo se envía a clientes con teléfono chileno válido y opt-in
                activo en su ficha.
              </li>
              <li>
                Los mensajes usan plantillas pre-aprobadas por WhatsApp; no
                podemos modificar el texto.
              </li>
              <li>
                Cada cliente puede desactivar WhatsApp desde el formulario de
                edición en cualquier momento.
              </li>
              <li>
                Si desactivas este ajuste, dejaremos de enviar recordatorios
                para toda la clínica de inmediato.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {data.clientsWithValidPhone === 0 && (
        <div className="rounded-md border bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 size-4 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium">
                Aún no tienes clientes con teléfono válido.
              </p>
              <p className="mt-1 text-muted-foreground">
                Antes de activar los recordatorios, asegúrate de registrar los
                teléfonos de tus clientes en formato chileno.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-lg border bg-card/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
