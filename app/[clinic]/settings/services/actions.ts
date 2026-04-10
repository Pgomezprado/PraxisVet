"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serviceSchema, type ServiceInput } from "@/lib/validations/services";
import type { Service } from "@/types";

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

export async function getServices(
  orgId: string
): Promise<ActionResult<Service[]>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as Service[] };
}

export async function getService(
  serviceId: string
): Promise<ActionResult<Service>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Service };
}

export async function createService(
  orgId: string,
  clinicSlug: string,
  formData: ServiceInput
): Promise<ActionResult<Service>> {
  const parsed = serviceSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("services")
    .insert({
      org_id: orgId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      category: parsed.data.category || null,
      duration_minutes: parsed.data.duration_minutes,
      price: parsed.data.price ?? null,
      active: parsed.data.active,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/settings/services`, "page");
  return { success: true, data: data as Service };
}

export async function updateService(
  serviceId: string,
  clinicSlug: string,
  formData: ServiceInput
): Promise<ActionResult<Service>> {
  const parsed = serviceSchema.safeParse(formData);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("services")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      category: parsed.data.category || null,
      duration_minutes: parsed.data.duration_minutes,
      price: parsed.data.price ?? null,
      active: parsed.data.active,
    })
    .eq("id", serviceId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/settings/services`, "page");
  return { success: true, data: data as Service };
}

export async function deleteService(
  serviceId: string,
  clinicSlug: string
): Promise<ActionResult> {
  const { supabase } = await getAuthUser();

  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("service_id", serviceId);

  if (count && count > 0) {
    const { error } = await supabase
      .from("services")
      .update({ active: false })
      .eq("id", serviceId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/${clinicSlug}/settings/services`, "page");
    return { success: true, data: undefined };
  }

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/settings/services`, "page");
  return { success: true, data: undefined };
}

export async function toggleServiceActive(
  serviceId: string,
  currentActive: boolean,
  clinicSlug: string
): Promise<ActionResult<Service>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("services")
    .update({ active: !currentActive })
    .eq("id", serviceId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/settings/services`, "page");
  return { success: true, data: data as Service };
}
