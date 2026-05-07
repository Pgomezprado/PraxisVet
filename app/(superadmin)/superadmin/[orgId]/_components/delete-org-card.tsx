"use client";

import { useState, useTransition } from "react";
import { Trash2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { deleteOrganization, type DeleteOrgResult } from "../actions";

type Props = {
  orgId: string;
  orgName: string;
  orgSlug: string;
};

export function DeleteOrgCard({ orgId, orgName, orgSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      let result: DeleteOrgResult;
      try {
        result = await deleteOrganization(orgId, typed);
      } catch {
        // redirect() throws NEXT_REDIRECT on success — eso significa que
        // todo salió bien y Next va a redirigir.
        return;
      }
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <Card className="border-red-500/40 bg-red-500/5">
      <CardHeader>
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-red-400" />
          <div className="space-y-1">
            <CardTitle className="text-red-400">Zona peligrosa</CardTitle>
            <CardDescription>
              Eliminar la clínica borra de forma permanente todos sus datos:
              equipo, clientes, mascotas, citas, fichas clínicas, recetas,
              vacunas, peluquería, facturas y archivos. Esta acción no se
              puede deshacer.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              setTyped("");
              setError(null);
            }
          }}
        >
          <DialogTrigger
            render={
              <Button variant="destructive" size="sm">
                <Trash2 className="size-4" data-icon="inline-start" />
                Eliminar clínica
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar {orgName}</DialogTitle>
              <DialogDescription>
                Esta acción borra permanentemente la clínica y todos sus
                datos. Para confirmar, escribe el slug exacto:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {orgSlug}
                </code>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="confirm-slug">Slug de la clínica</Label>
              <Input
                id="confirm-slug"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={orgSlug}
                autoComplete="off"
                disabled={pending}
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={pending || typed.trim() !== orgSlug}
              >
                {pending ? "Eliminando..." : "Eliminar definitivamente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
