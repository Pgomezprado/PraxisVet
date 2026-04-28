"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  setWhatsAppReminders,
  setWhatsAppReminderType,
  type WhatsAppReminderType,
} from "../actions";

type ToggleState = {
  master: boolean;
  reminder24h: boolean;
  confirmation: boolean;
};

export function WhatsAppToggle({
  clinicSlug,
  initialEnabled,
  initialReminder24h,
  initialConfirmation,
  disabled,
  disabledReason,
  planLocked,
}: {
  clinicSlug: string;
  initialEnabled: boolean;
  initialReminder24h: boolean;
  initialConfirmation: boolean;
  disabled?: boolean;
  disabledReason?: string;
  planLocked?: boolean;
}) {
  const [state, setState] = useState<ToggleState>({
    master: initialEnabled,
    reminder24h: initialReminder24h,
    confirmation: initialConfirmation,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleMasterChange(value: boolean) {
    setError(null);
    const previous = state.master;
    setState((s) => ({ ...s, master: value }));

    startTransition(async () => {
      const result = await setWhatsAppReminders(clinicSlug, value);
      if (!result.success) {
        setError(result.error);
        setState((s) => ({ ...s, master: previous }));
      }
    });
  }

  function handleSubToggle(type: WhatsAppReminderType, value: boolean) {
    setError(null);
    const key = type === "appt_reminder_24h" ? "reminder24h" : "confirmation";
    const previous = state[key];
    setState((s) => ({ ...s, [key]: value }));

    startTransition(async () => {
      const result = await setWhatsAppReminderType(clinicSlug, type, value);
      if (!result.success) {
        setError(result.error);
        setState((s) => ({ ...s, [key]: previous }));
      }
    });
  }

  const masterDisabled = disabled || planLocked || isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border p-4">
        <Switch
          id="whatsapp-reminders"
          checked={state.master}
          onCheckedChange={handleMasterChange}
          disabled={masterDisabled}
        />
        <div className="flex-1">
          <Label
            htmlFor="whatsapp-reminders"
            className="cursor-pointer text-sm font-medium"
          >
            Recordatorios WhatsApp
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Activador maestro. Cuando esté encendido, los sub-tipos
            seleccionados abajo se enviarán a los clientes con WhatsApp activo
            en su ficha.
          </p>
          {planLocked && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs">
              <Sparkles className="mt-0.5 size-3.5 text-amber-600" />
              <div className="flex-1 space-y-1.5 text-amber-700 dark:text-amber-400">
                <p className="font-medium">Disponible en plan Pro</p>
                <p>
                  Tu plan actual (Básico) no incluye recordatorios automáticos
                  por WhatsApp.
                </p>
                <Link
                  href={`/${clinicSlug}/settings`}
                  className="mt-1 inline-flex h-8 items-center justify-center rounded-md border border-amber-600/40 bg-amber-500/10 px-3 text-xs font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
                >
                  Mejorar a Pro
                </Link>
              </div>
            </div>
          )}
          {!planLocked && disabled && disabledReason && (
            <p className="mt-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-600 dark:text-amber-400">
              {disabledReason}
            </p>
          )}
        </div>
      </div>

      {state.master && !planLocked && (
        <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            ¿Qué mensajes enviamos?
          </p>

          <SubToggle
            id="reminder-24h"
            checked={state.reminder24h}
            disabled={isPending}
            onChange={(v) => handleSubToggle("appt_reminder_24h", v)}
            title="Recordatorio 24h antes de la cita"
            description="Cada mañana enviamos un recordatorio a los tutores con citas para el día siguiente."
          />

          <SubToggle
            id="confirmation"
            checked={state.confirmation}
            disabled={isPending}
            onChange={(v) => handleSubToggle("appt_confirmation", v)}
            title="Confirmación al agendar cita"
            description="Apenas se crea o confirma una cita, enviamos una confirmación inmediata al tutor."
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function SubToggle({
  id,
  checked,
  disabled,
  onChange,
  title,
  description,
}: {
  id: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border bg-card p-3">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
      <div className="flex-1">
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {title}
        </Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
