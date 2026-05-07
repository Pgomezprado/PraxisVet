"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  updateWhatsAppSettings,
  type WhatsAppSettings,
} from "../actions";

type Props = {
  clinic: string;
  initial: WhatsAppSettings;
};

export function WhatsAppSettingsForm({ clinic, initial }: Props) {
  const [settings, setSettings] = useState<WhatsAppSettings>(initial);
  const [pending, start] = useTransition();
  const dirty = !shallowEqual(settings, initial);

  function patch<K extends keyof WhatsAppSettings>(key: K, value: boolean) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleMaster(value: boolean) {
    // Apagar el master deja los sub-toggles tal cual (preservar la elección
    // del admin). Solo deshabilitamos visualmente. Si el admin guarda con
    // master=false, el dispatcher no envía nada de todas formas.
    patch("whatsapp_reminders_enabled", value);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const result = await updateWhatsAppSettings(clinic, settings);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setSettings(result.data);
      toast.success("Ajustes de WhatsApp guardados.");
    });
  }

  const masterOn = settings.whatsapp_reminders_enabled;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card">
        <div className="flex items-start justify-between gap-4 p-4">
          <div className="space-y-1">
            <Label className="text-base">WhatsApp habilitado</Label>
            <p className="text-sm text-muted-foreground">
              Activa el envío de mensajes WhatsApp desde esta clínica. Si lo
              apagas, no se enviará ninguna notificación aunque las opciones
              de abajo estén activas.
            </p>
          </div>
          <Switch
            checked={masterOn}
            onCheckedChange={handleMaster}
            disabled={pending}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Tipos de mensaje
        </h3>

        <ToggleRow
          title="Confirmación de cita"
          description="Mensaje al tutor cuando confirmas una cita en la agenda."
          checked={settings.whatsapp_appt_confirmation_enabled}
          disabled={!masterOn || pending}
          onChange={(v) => patch("whatsapp_appt_confirmation_enabled", v)}
        />

        <ToggleRow
          title="Recordatorio 24h antes"
          description="Mensaje automático el día antes de la cita en la mañana."
          checked={settings.whatsapp_appt_reminder_24h_enabled}
          disabled={!masterOn || pending}
          onChange={(v) => patch("whatsapp_appt_reminder_24h_enabled", v)}
        />

        <ToggleRow
          title="Recordatorio de vacunas"
          description="Aviso al tutor cuando una vacuna está próxima a vencer (7 días antes)."
          checked={settings.whatsapp_vaccine_reminder_enabled}
          disabled={!masterOn || pending}
          onChange={(v) => patch("whatsapp_vaccine_reminder_enabled", v)}
        />
      </div>

      <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Aviso legal (Ley 19.628):</strong>{" "}
        solo se envían mensajes a tutores que dieron consentimiento explícito
        en su ficha de cliente. Si el tutor no ha aceptado WhatsApp, no
        recibirá nada aunque tengas estas opciones activadas.
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={!dirty || pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4">
      <div className="space-y-1">
        <Label className="text-base">{title}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  for (const k of Object.keys(a) as (keyof T)[]) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}
