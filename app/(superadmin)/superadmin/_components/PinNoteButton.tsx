"use client";

import { useState, useTransition } from "react";
import { Loader, Pin } from "lucide-react";

import { togglePinNoteAction } from "../actions";

type Props = {
  noteId: string;
  orgId: string;
  isPinned: boolean;
};

export function PinNoteButton({ noteId, orgId, isPinned }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await togglePinNoteAction(noteId, orgId);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  const label = isPinned ? "Quitar fijación" : "Fijar nota";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        title={label}
        aria-label={label}
        aria-pressed={isPinned}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors disabled:opacity-50 ${
          isPinned
            ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
            : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/40 hover:text-foreground"
        }`}
      >
        {pending ? (
          <Loader className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Pin
            className="h-3.5 w-3.5"
            fill={isPinned ? "currentColor" : "none"}
          />
        )}
      </button>
      {error && (
        <span className="text-xs text-red-400" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
