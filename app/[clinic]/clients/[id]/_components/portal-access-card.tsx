"use client";

import { useState, useTransition } from "react";
import { Send, ShieldOff, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  sendPortalInvitation,
  revokeClientPortalAccess,
} from "../../actions";
import type { ClientAuthLinkStatus } from "@/lib/invitations/portal";

type Props = {
  clientId: string;
  clinicSlug: string;
  hasEmail: boolean;
  canManage: boolean; // true si user es admin
  initialStatus: ClientAuthLinkStatus;
};

export function PortalAccessCard({
  clientId,
  clinicSlug,
  hasEmail,
  canManage,
  initialStatus,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);
  const [isPending, startTransition] = useTransition();

  function invite() {
    setMessage(null);
    startTransition(async () => {
      const res = await sendPortalInvitation(clientId, clinicSlug);
      if (!res.success) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setStatus({
        exists: true,
        active: true,
        linked: false,
        invitedAt: new Date().toISOString(),
        linkedAt: null,
      });
      setMessage({
        type: "success",
        text: "Invitación enviada. El cliente recibirá el enlace por email.",
      });
    });
  }

  function revoke() {
    if (
      !confirm(
        "¿Quitar el acceso al portal? El cliente no podrá volver a ingresar hasta que lo vuelvas a invitar."
      )
    ) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const res = await revokeClientPortalAccess(clientId, clinicSlug);
      if (!res.success) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setStatus({
        exists: true,
        active: false,
        linked: status.linked,
        invitedAt: status.invitedAt,
        linkedAt: status.linkedAt,
      });
      setMessage({
        type: "success",
        text: "Acceso revocado. El cliente perdió el acceso al portal.",
      });
    });
  }

  const badge = renderBadge(status);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              Portal del tutor
              {badge}
            </CardTitle>
            <CardDescription>
              Dale acceso al cliente para que vea sus mascotas, próximas citas
              e historial de vacunas.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasEmail && (
          <p className="rounded-md bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
            Para invitar al cliente al portal, primero agrega su email en los
            datos de contacto.
          </p>
        )}

        {status.exists && status.linked && status.active && (
          <p className="text-sm text-muted-foreground">
            Activo desde el{" "}
            {new Date(status.linkedAt!).toLocaleDateString("es-CL")}.
          </p>
        )}
        {status.exists && !status.linked && status.active && (
          <p className="text-sm text-muted-foreground">
            Invitación enviada el{" "}
            {new Date(status.invitedAt!).toLocaleDateString("es-CL")}.
            Esperando que el cliente abra el enlace.
          </p>
        )}
        {status.exists && !status.active && (
          <p className="text-sm text-muted-foreground">
            Acceso revocado. Puedes re-invitar cuando quieras.
          </p>
        )}

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            {!status.exists || !status.active ? (
              <Button
                size="sm"
                disabled={!hasEmail || isPending}
                onClick={invite}
              >
                <Send className="size-4" data-icon="inline-start" />
                {status.exists
                  ? "Volver a invitar"
                  : "Invitar al portal"}
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasEmail || isPending}
                  onClick={invite}
                >
                  <Send className="size-4" data-icon="inline-start" />
                  Reenviar invitación
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={revoke}
                  className="text-destructive hover:text-destructive"
                >
                  <ShieldOff className="size-4" data-icon="inline-start" />
                  Revocar acceso
                </Button>
              </>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Solo un administrador puede modificar el acceso al portal.
          </p>
        )}

        {message && (
          <p
            role={message.type === "error" ? "alert" : "status"}
            className={
              message.type === "error"
                ? "text-sm text-destructive"
                : "text-sm text-emerald-600 dark:text-emerald-400"
            }
          >
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function renderBadge(status: ClientAuthLinkStatus) {
  if (!status.exists) {
    return (
      <Badge variant="secondary" className="text-[10px]">
        Sin acceso
      </Badge>
    );
  }
  if (!status.active) {
    return (
      <Badge variant="outline" className="text-[10px]">
        Revocado
      </Badge>
    );
  }
  if (status.linked) {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 text-[10px] dark:text-emerald-400">
        <CheckCircle2 className="size-3" data-icon="inline-start" />
        Activo
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/15 text-amber-600 text-[10px] dark:text-amber-400">
      <Clock className="size-3" data-icon="inline-start" />
      Pendiente
    </Badge>
  );
}
