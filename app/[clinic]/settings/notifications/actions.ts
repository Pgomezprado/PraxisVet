"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isWhatsAppConfigured } from "@/lib/notifications";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type NotificationSettings = {
  orgId: string;
  orgName: string;
  whatsappRemindersEnabled: boolean;
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
      "org_id, role, organizations!inner(id, name, slug, whatsapp_reminders_enabled)"
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
    whatsapp_reminders_enabled: boolean;
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
      whatsappRemindersEnabled: org.whatsapp_reminders_enabled,
      clientsWithValidPhone: validPhoneRes.count ?? 0,
      clientsOptedIn: optedInRes.count ?? 0,
      providerConfigured: isWhatsAppConfigured(),
    },
  };
}

export async function setWhatsAppReminders(
  clinicSlug: string,
  enabled: boolean
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id, role, organizations!inner(slug)")
    .eq("user_id", user.id)
    .eq("active", true)
    .eq("organizations.slug", clinicSlug)
    .single();

  if (!membership) return { success: false, error: "Clínica no encontrada" };
  if (membership.role !== "admin") {
    return {
      success: false,
      error: "Solo los administradores pueden modificar este ajuste.",
    };
  }

  const { data, error } = await supabase
    .from("organizations")
    .update({ whatsapp_reminders_enabled: enabled })
    .eq("id", membership.org_id)
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) {
    return { success: false, error: "No se pudo actualizar el ajuste." };
  }

  revalidatePath(`/${clinicSlug}/settings/notifications`);
  return { success: true, data: undefined };
}
