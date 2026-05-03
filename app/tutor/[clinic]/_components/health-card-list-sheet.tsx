"use client";

import { useState, useTransition } from "react";
import { ShieldOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { revokeHealthCard, type HealthCardSummary } from "../actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicSlug: string;
  cards: HealthCardSummary[];
  onRevoked: (cardId: string) => void;
};

export function HealthCardListSheet({
  open,
  onOpenChange,
  clinicSlug,
  cards,
  onRevoked,
}: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirmRevoke() {
    if (!confirmId) return;
    const cardId = confirmId;
    startTransition(async () => {
      const res = await revokeHealthCard(clinicSlug, { cardId });
      if (!res.success) {
        toast.error(res.error || "No pudimos revocar la cartola");
        return;
      }
      onRevoked(cardId);
      setConfirmId(null);
      toast.success("Cartola revocada");
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-2xl sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>Cartolas emitidas</SheetTitle>
            <SheetDescription>
              Puedes revocar cualquier cartola activa cuando quieras.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-4">
            {cards.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aún no has emitido cartolas.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {cards.map((card) => (
                  <li
                    key={card.id}
                    className="flex flex-wrap items-start justify-between gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        Cartola del {formatDateLong(card.createdAt)}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <StatusBadge status={card.status} />
                        <span>·</span>
                        {card.status === "revoked" ? (
                          <span>
                            Revocada{" "}
                            {card.revokedAt
                              ? formatDateLong(card.revokedAt)
                              : ""}
                          </span>
                        ) : card.status === "expired" ? (
                          <span>Venció {formatDateLong(card.expiresAt)}</span>
                        ) : (
                          <span>Vence {formatDateLong(card.expiresAt)}</span>
                        )}
                        <Separator orientation="vertical" className="h-3" />
                        <span className="inline-flex items-center gap-1">
                          <Eye className="size-3" />
                          {card.viewCount}{" "}
                          {card.viewCount === 1 ? "vista" : "vistas"}
                        </span>
                      </div>
                    </div>
                    {card.status === "active" ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmId(card.id)}
                      >
                        <ShieldOff
                          className="size-3.5"
                          data-icon="inline-start"
                        />
                        Revocar
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={confirmId !== null}
        onOpenChange={(o) => !o && setConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Revocar esta cartola?</DialogTitle>
            <DialogDescription>
              Quien tenga el link verá que ya no es válida.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => setConfirmId(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleConfirmRevoke}
            >
              {isPending ? "Revocando..." : "Sí, revocar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusBadge({ status }: { status: HealthCardSummary["status"] }) {
  if (status === "active") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
        Activa
      </Badge>
    );
  }
  if (status === "expired") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Vencida
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/15 text-red-500 hover:bg-red-500/15">
      Revocada
    </Badge>
  );
}

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
