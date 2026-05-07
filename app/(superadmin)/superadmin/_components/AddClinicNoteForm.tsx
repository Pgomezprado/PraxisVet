"use client";

import { useRef, useState, useTransition } from "react";
import { Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addClinicNoteAction } from "../actions";

type Props = {
  orgId: string;
};

export function AddClinicNoteForm({ orgId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = value.trim();
    if (body.length === 0) {
      setError("La nota no puede estar vacía");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await addClinicNoteAction(orgId, body);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setValue("");
      ref.current?.focus();
    });
  }

  const remaining = 2000 - value.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ej: llamé hoy, quedaron de revisar la propuesta el lunes."
        maxLength={2000}
        rows={3}
        disabled={pending}
        aria-invalid={!!error}
      />
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {error ? (
            <span className="text-red-400" role="alert">
              {error}
            </span>
          ) : (
            <span>{remaining} caracteres restantes</span>
          )}
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={pending || value.trim().length === 0}
        >
          {pending && <Loader className="h-3.5 w-3.5 animate-spin" />}
          Guardar nota
        </Button>
      </div>
    </form>
  );
}
