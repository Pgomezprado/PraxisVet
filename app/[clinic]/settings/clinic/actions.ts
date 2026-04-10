"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  clinicSettingsSchema,
  type ClinicSettingsInput,
} from "@/lib/validations/clinic-settings";
import type { Organization } from "@/types";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function getClinicSettings(
  orgSlug: string
): Promise<ActionResult<Organization>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", orgSlug)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Organization };
}

export async function updateClinicSettings(
  orgId: string,
  clinicSlug: string,
  formData: ClinicSettingsInput
): Promise<ActionResult<Organization>> {
  const parsed = clinicSettingsSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
    })
    .eq("id", orgId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/settings/clinic`, "page");
  revalidatePath(`/${clinicSlug}`, "layout");
  return { success: true, data: data as Organization };
}
