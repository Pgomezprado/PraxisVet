"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type WhatsAppSettings = {
  whatsapp_reminders_enabled: boolean;
  whatsapp_appt_confirmation_enabled: boolean;
  whatsapp_appt_reminder_24h_enabled: boolean;
  whatsapp_vaccine_reminder_enabled: boolean;
};

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const settingsSchema = z.object({
  whatsapp_reminders_enabled: z.boolean(),
  whatsapp_appt_confirmation_enabled: z.boolean(),
  whatsapp_appt_reminder_24h_enabled: z.boolean(),
  whatsapp_vaccine_reminder_enabled: z.boolean(),
});

async function requireAdmin(clinicSlug: string): Promise<
  | { ok: true; orgId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id, role, organizations!inner(slug)")
    .eq("user_id", user.id)
    .eq("active", true)
    .eq("organizations.slug", clinicSlug)
    .maybeSingle();

  if (!membership) return { ok: false, error: "Clínica no encontrada" };
  if (membership.role !== "admin") {
    return { ok: false, error: "Solo administradores pueden cambiar estos ajustes." };
  }
  return { ok: true, orgId: membership.org_id as string };
}

export async function getWhatsAppSettings(
  clinicSlug: string,
): Promise<ActionResult<WhatsAppSettings>> {
  const guard = await requireAdmin(clinicSlug);
  if (!guard.ok) return { success: false, error: guard.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select(
      "whatsapp_reminders_enabled, whatsapp_appt_confirmation_enabled, whatsapp_appt_reminder_24h_enabled, whatsapp_vaccine_reminder_enabled",
    )
    .eq("id", guard.orgId)
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "No se pudo cargar." };
  }
  return { success: true, data };
}

export async function updateWhatsAppSettings(
  clinicSlug: string,
  input: WhatsAppSettings,
): Promise<ActionResult<WhatsAppSettings>> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const guard = await requireAdmin(clinicSlug);
  if (!guard.ok) return { success: false, error: guard.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update(parsed.data)
    .eq("id", guard.orgId)
    .select(
      "whatsapp_reminders_enabled, whatsapp_appt_confirmation_enabled, whatsapp_appt_reminder_24h_enabled, whatsapp_vaccine_reminder_enabled",
    )
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "No se pudo guardar." };
  }

  revalidatePath(`/${clinicSlug}/settings/whatsapp`, "page");
  return { success: true, data };
}
