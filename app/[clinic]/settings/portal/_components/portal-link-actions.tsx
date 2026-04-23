"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  RotateCcw,
  Calendar as CalendarIcon,
  History,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  revokePortalLinkById,
  restorePortalLinkById,
  setPortalLinkExpiration,
  getPortalLinkAuditLog,
  type PortalAuditRow,
  type PortalLinkRow,
} from "../actions";

const EVENT_LABELS: Record<string, string> = {
  link_requested: "Invitación enviada",
  link_consumed: "Primer acceso",
  access_granted: "Acceso al portal",
  access_revoked: "Acceso revocado",
  access_renewed: "Acceso restaurado",
  expiration_set: "Expiración modificada",
  bootstrap_failed: "Intento bloqueado",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function PortalLinkActions({
  link,
  clinicSlug,
}: {
  link: PortalLinkRow;
  clinicSlug: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [expirationOpen, setExpirationOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<PortalAuditRow[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expirationValue, setExpirationValue] = useState(
    link.expires_at ? link.expires_at.slice(0, 10) : ""
  );

  function refreshAfter(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  async function handleRevoke() {
    refreshAfter(async () => {
      const r = await revokePortalLinkById(clinicSlug, link.id);
      if (!r.success) {
        setError(r.error);
        return;
      }
      setConfirmRevoke(false);
    });
  }

  async function handleRestore() {
    refreshAfter(async () => {
      const r = await restorePortalLinkById(clinicSlug, link.id);
      if (!r.success) setError(r.error);
    });
  }

  async function handleSetExpiration() {
    refreshAfter(async () => {
      const r = await setPortalLinkExpiration(clinicSlug, {
        linkId: link.id,
        expiresAt: expirationValue || null,
      });
      if (!r.success) {
        setError(r.error);
        return;
      }
      setExpirationOpen(false);
    });
  }

  async function loadHistory() {
    setHistoryLoading(true);
    const r = await getPortalLinkAuditLog(clinicSlug, link.id);
    setHistoryLoading(false);
    if (r.success) setHistory(r.data);
    else setError(r.error);
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {error && (
        <span className="mr-2 text-xs text-destructive" title={error}>
          {error.length > 32 ? error.slice(0, 32) + "…" : error}
        </span>
      )}

      {/* Historial */}
      <Dialog
        open={historyOpen}
        onOpenChange={(open) => {
          setHistoryOpen(open);
          if (open && !history) loadHistory();
        }}
      >
        <DialogTrigger
          render={
            <Button variant="ghost" size="icon-sm" title="Historial de accesos">
              <History className="size-3.5" />
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historial — {link.client_name}</DialogTitle>
            <DialogDescription>
              Últimos eventos del portal de este tutor.
            </DialogDescription>
          </DialogHeader>
          {historyLoading && (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          )}
          {!historyLoading && history && history.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Sin eventos registrados aún.
            </p>
          )}
          {!historyLoading && history && history.length > 0 && (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {history.map((row) => (
                <li
                  key={row.id}
                  className="rounded-md border border-border/50 p-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {EVENT_LABELS[row.event] ?? row.event}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDateTime(row.occurred_at)}
                    </span>
                  </div>
                  {(row.ip || row.metadata) && (
                    <p className="mt-1 text-muted-foreground">
                      {row.ip && <span>IP: {row.ip}</span>}
                      {row.ip && row.metadata ? " · " : ""}
                      {row.metadata && (
                        <span>{JSON.stringify(row.metadata)}</span>
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expiración */}
      <Dialog open={expirationOpen} onOpenChange={setExpirationOpen}>
        <DialogTrigger
          render={
            <Button variant="ghost" size="icon-sm" title="Setear expiración">
              <CalendarIcon className="size-3.5" />
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expiración del acceso</DialogTitle>
            <DialogDescription>
              Define una fecha en la que el acceso del tutor caducará. Déjalo
              vacío para acceso indefinido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`exp-${link.id}`}>Fecha de expiración</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`exp-${link.id}`}
                type="date"
                value={expirationValue}
                onChange={(e) => setExpirationValue(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
              {expirationValue && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setExpirationValue("")}
                  title="Quitar expiración"
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpirationOpen(false)}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSetExpiration} disabled={pending}>
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revocar / Restaurar */}
      {link.status === "revoked" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestore}
          disabled={pending}
          title="Restaurar acceso"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
          Restaurar
        </Button>
      ) : (
        <Dialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
          <DialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                title="Revocar acceso"
                onClick={() => setConfirmRevoke(true)}
              >
                <Ban className="size-3.5 text-destructive" />
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revocar acceso al portal</DialogTitle>
              <DialogDescription>
                {link.client_name} dejará de poder acceder al portal con su
                cuenta. Podrás restaurar el acceso desde esta misma pantalla.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmRevoke(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleRevoke}
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  "Revocar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
