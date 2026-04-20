"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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

interface DeleteButtonProps {
  label: string;
  description: string;
  onDelete: () => Promise<{ success: boolean; error?: string }>;
  redirectTo?: string;
}

export function DeleteButton({
  label,
  description,
  onDelete,
  redirectTo,
}: DeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);

    const result = await onDelete();

    if (!result.success) {
      setError(result.error ?? "Error al eliminar");
      setLoading(false);
      return;
    }

    setOpen(false);
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
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
          <Button variant="destructive" size="sm">
            <Trash2 className="size-4" data-icon="inline-start" />
            Eliminar
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Eliminando..." : "Confirmar eliminacion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
