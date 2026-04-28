"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isWhatsAppConfigured } from "@/lib/notifications";
import type { Plan } from "@/types";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type WhatsAppReminderType = "appt_reminder_24h" | "appt_confirmation";

export type NotificationSettings = {
  orgId: string;
  orgName: string;
  plan: Plan;
  whatsappRemindersEnabled: boolean;
  whatsappApptReminder24hEnabled: boolean;
  whatsappApptConfirmationEnabled: boolean;
  clientsWithValidPhone: number;
  clientsOptedIn: number;
  providerConfigured: boolean;
};

export async function getNotificationSettings(
  clinicSlug: string
): Promise<ActionResult<NotificationSettings>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select(
      "org_id, role, organizations!inner(id, name, slug, plan, whatsapp_reminders_enabled, whatsapp_appt_reminder_24h_enabled, whatsapp_appt_confirmation_enabled)"
    )
    .eq("user_id", user.id)
    .eq("active", true)
    .eq("organizations.slug", clinicSlug)
    .single();

  if (!membership) return { success: false, error: "Clínica no encontrada" };
  if (membership.role !== "admin") {
    return {
      success: false,
      error: "Solo los administradores pueden modificar las notificaciones.",
    };
  }

  const org = (membership.organizations as unknown) as {
    id: string;
    name: string;
    slug: string;
    plan: Plan;
    whatsapp_reminders_enabled: boolean;
    whatsapp_appt_reminder_24h_enabled: boolean;
    whatsapp_appt_confirmation_enabled: boolean;
  };

  const [validPhoneRes, optedInRes] = await Promise.all([
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("org_id", org.id)
      .not("phone_e164", "is", null),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("org_id", org.id)
      .eq("whatsapp_opt_in", true)
      .not("phone_e164", "is", null),
  ]);

  return {
    success: true,
    data: {
      orgId: org.id,
      orgName: org.name,
      plan: org.plan,
      whatsappRemindersEnabled: org.whatsapp_reminders_enabled,
      whatsappApptReminder24hEnabled: org.whatsapp_appt_reminder_24h_enabled,
      whatsappApptConfirmationEnabled: org.whatsapp_appt_confirmation_enabled,
      clientsWithValidPhone: validPhoneRes.count ?? 0,
      clientsOptedIn: optedInRes.count ?? 0,
      providerConfigured: isWhatsAppConfigured(),
    },
  };
}

type AdminCtx =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; orgId: string; plan: Plan }
  | { ok: false; error: string };

async function getAdminMembership(clinicSlug: string): Promise<AdminCtx> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select(
      "org_id, role, organizations!inner(slug, plan)"
    )
    .eq("user_id", user.id)
    .eq("active", true)
    .eq("organizations.slug", clinicSlug)
    .single();

  if (!membership) return { ok: false, error: "Clínica no encontrada" };
  if (membership.role !== "admin") {
    return {
      ok: false,
      error: "Solo los administradores pueden modificar este ajuste.",
    };
  }

  const org = (membership.organizations as unknown) as {
    slug: string;
    plan: Plan;
  };

  return { ok: true, supabase, orgId: membership.org_id, plan: org.plan };
}

export async function setWhatsAppReminders(
  clinicSlug: string,
  enabled: boolean
): Promise<ActionResult> {
  const ctx = await getAdminMembership(clinicSlug);
  if (!ctx.ok) return { success: false, error: ctx.error };

  // Pricing gate: WhatsApp es feature de Pro y Enterprise.
  if (enabled && ctx.plan === "basico") {
    return {
      success: false,
      error:
        "Los recordatorios WhatsApp están disponibles en plan Pro o superior. Actualiza tu plan en Configuración → Suscripción.",
    };
  }

  const { data, error } = await ctx.supabase
    .from("organizations")
    .update({ whatsapp_reminders_enabled: enabled })
    .eq("id", ctx.orgId)
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) {
    return { success: false, error: "No se pudo actualizar el ajuste." };
  }

  revalidatePath(`/${clinicSlug}/settings/notifications`);
  return { success: true, data: undefined };
}

export async function setWhatsAppReminderType(
  clinicSlug: string,
  type: WhatsAppReminderType,
  enabled: boolean
): Promise<ActionResult> {
  const ctx = await getAdminMembership(clinicSlug);
  if (!ctx.ok) return { success: false, error: ctx.error };

  // Sub-toggles también requieren plan Pro+ (consistencia: si encendiste el
  // master switch en Pro y luego bajaste a básico, igual no envías).
  if (enabled && ctx.plan === "basico") {
    return {
      success: false,
      error:
        "Disponible en plan Pro o superior. Actualiza tu plan en Configuración → Suscripción.",
    };
  }

  const column =
    type === "appt_reminder_24h"
      ? "whatsapp_appt_reminder_24h_enabled"
      : "whatsapp_appt_confirmation_enabled";

  const { data, error } = await ctx.supabase
    .from("organizations")
    .update({ [column]: enabled })
    .eq("id", ctx.orgId)
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) {
    return { success: false, error: "No se pudo actualizar el ajuste." };
  }

  revalidatePath(`/${clinicSlug}/settings/notifications`);
  return { success: true, data: undefined };
}
