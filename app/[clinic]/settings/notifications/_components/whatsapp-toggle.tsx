"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setWhatsAppReminders } from "../actions";

export function WhatsAppToggle({
  clinicSlug,
  initialEnabled,
  disabled,
  disabledReason,
}: {
  clinicSlug: string;
  initialEnabled: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(value: boolean) {
    setError(null);
    const previous = enabled;
    setEnabled(value);

    startTransition(async () => {
      const result = await setWhatsAppReminders(clinicSlug, value);
      if (!result.success) {
        setError(result.error);
        setEnabled(previous);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 rounded-lg border p-4">
        <Switch
          id="whatsapp-reminders"
          checked={enabled}
          onCheckedChange={handleChange}
          disabled={disabled || isPending}
        />
        <div className="flex-1">
          <Label
            htmlFor="whatsapp-reminders"
            className="cursor-pointer text-sm font-medium"
          >
            Enviar recordatorios automáticos por WhatsApp
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Cuando esté activo, cada mañana y tarde enviaremos recordatorios
            de citas del día siguiente a los clientes con WhatsApp activado en
            su ficha.
          </p>
          {disabled && disabledReason && (
            <p className="mt-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-600 dark:text-amber-400">
              {disabledReason}
            </p>
          )}
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
