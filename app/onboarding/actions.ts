"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema, type OnboardingInput } from "@/lib/validations/onboarding";

export async function createOrganization(input: OnboardingInput) {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Datos invalidos" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false as const, error: "No autenticado" };
  }

  const { data: existing } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", parsed.data.slug)
    .single();

  if (existing) {
    return { success: false as const, error: "Este slug ya esta en uso" };
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: parsed.data.clinicName,
      slug: parsed.data.slug,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
    })
    .select("id, slug")
    .single();

  if (orgError || !org) {
    console.error("Error creating organization:", orgError);
    return { success: false as const, error: `Error al crear la clinica: ${orgError?.message ?? "unknown"}` };
  }

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      org_id: org.id,
      user_id: user.id,
      role: "admin",
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
    });

  if (memberError) {
    console.error("Error creating member:", memberError);
    return { success: false as const, error: `Error al registrar al administrador: ${memberError.message}` };
  }

  redirect(`/${org.slug}/dashboard`);
}

export async function checkSlugAvailability(slug: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .single();

  return { available: !data };
}
