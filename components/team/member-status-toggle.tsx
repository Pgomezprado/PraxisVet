"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Power, PowerOff, Loader2 } from "lucide-react";
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
import { toggleMemberActive } from "@/app/[clinic]/settings/team/actions";

interface MemberStatusToggleProps {
  memberId: string;
  memberName: string;
  clinicSlug: string;
  active: boolean;
  hasLogin: boolean;
  canToggle: boolean;
}

export function MemberStatusToggle({
  memberId,
  memberName,
  clinicSlug,
  active,
  hasLogin,
  canToggle,
}: MemberStatusToggleProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canToggle) {
    return null;
  }

  if (!active) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={async () => {
          setLoading(true);
          await toggleMemberActive(memberId, clinicSlug, true);
          setLoading(false);
          router.refresh();
        }}
        disabled={loading}
        title="Reactivar"
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <PowerOff className="size-3.5" />
        )}
      </Button>
    );
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await toggleMemberActive(memberId, clinicSlug, false);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" title="Revocar acceso">
            <Power className="size-3.5" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revocar acceso de {memberName}</DialogTitle>
          <DialogDescription>
            {hasLogin
              ? "Vas a desactivar este miembro y cerrar su sesión en todos los dispositivos. Dejará de ver datos de la clínica de inmediato. Puedes reactivarlo después si fue un error."
              : "Vas a desactivar este miembro. Como no tiene cuenta activa, solo lo ocultamos del equipo. Puedes reactivarlo después."}
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
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Revocando..." : "Revocar acceso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
