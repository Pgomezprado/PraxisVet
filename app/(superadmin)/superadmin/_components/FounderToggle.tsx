"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader, Star, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setFounderAction } from "../actions";

type Props = {
  orgId: string;
  isFounder: boolean;
};

export function FounderToggle({ orgId, isFounder }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(next: boolean) {
    if (!next) {
      const ok = window.confirm(
        "¿Quitar el estado de fundadora? Esto sólo cambia la marca; no afecta su suscripción.",
      );
      if (!ok) return;
    }

    setError(null);
    startTransition(async () => {
      const result = await setFounderAction(orgId, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (isFounder) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="border-violet-500/40 bg-violet-500/10 text-violet-400"
        >
          <Star className="mr-1 h-3 w-3" /> Fundadora
        </Badge>
        <Button
          variant="ghost"
          size="xs"
          disabled={pending}
          onClick={() => toggle(false)}
          title="Quitar marca de fundadora"
        >
          {pending ? <Loader className="h-3 w-3 animate-spin" /> : <X />}
          Quitar
        </Button>
        {error && (
          <span className="text-xs text-red-400" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => toggle(true)}
      >
        {pending ? (
          <Loader className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Star className="h-3.5 w-3.5" />
        )}
        Marcar como fundadora
      </Button>
      {error && (
        <span className="text-xs text-red-400" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
