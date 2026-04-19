"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  dewormingSchema,
  type DewormingInput,
} from "@/lib/validations/dewormings";
import type { Deworming, OrganizationMember } from "@/types";
import { validateMemberInOrg } from "@/lib/auth/validate-member";
import { formatSupabaseError } from "@/lib/errors/format-supabase-error";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getAuthUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

function revalidateDewormings(basePath?: string) {
  if (basePath) revalidatePath(basePath);
}

export interface DewormingWithVet extends Deworming {
  vet_first_name: string | null;
  vet_last_name: string | null;
}

export async function getDewormings(
  petId: string
): Promise<ActionResult<DewormingWithVet[]>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("dewormings")
    .select(
      `
      *,
      organization_members!dewormings_vet_id_fkey (
        first_name,
        last_name
      )
    `
    )
    .eq("pet_id", petId)
    .order("date_administered", { ascending: false });

  if (error) {
    return { success: false, error: formatSupabaseError(error) };
  }

  const dewormings = (data ?? []).map((d) => {
    const member = d.organization_members as unknown as {
      first_name: string | null;
      last_name: string | null;
    } | null;
    const { organization_members: _omit, ...rest } = d;
    return {
      ...rest,
      vet_first_name: member?.first_name ?? null,
      vet_last_name: member?.last_name ?? null,
    } as DewormingWithVet;
  });

  return { success: true, data: dewormings };
}

export async function getDewormingsByRecord(
  recordId: string
): Promise<ActionResult<DewormingWithVet[]>> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("dewormings")
    .select(
      `
      *,
      organization_members!dewormings_vet_id_fkey (
        first_name,
        last_name
      )
    `
    )
    .eq("clinical_record_id", recordId)
    .order("date_administered", { ascending: false });

  if (error) {
    return { success: false, error: formatSupabaseError(error) };
  }

  const dewormings = (data ?? []).map((d) => {
    const member = d.organization_members as unknown as {
      first_name: string | null;
      last_name: string | null;
    } | null;
    const { organization_members: _omit, ...rest } = d;
    return {
      ...rest,
      vet_first_name: member?.first_name ?? null,
      vet_last_name: member?.last_name ?? null,
    } as DewormingWithVet;
  });

  return { success: true, data: dewormings };
}

export async function createDeworming(
  orgId: string,
  input: DewormingInput,
  basePath?: string
): Promise<ActionResult<Deworming>> {
  const parsed = dewormingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos" };
  }

  const { supabase } = await getAuthUser();

  const { data: pet } = await supabase
    .from("pets")
    .select("org_id")
    .eq("id", parsed.data.pet_id)
    .maybeSingle();

  if (!pet || pet.org_id !== orgId) {
    return { success: false, error: "Mascota no válida" };
  }

  if (parsed.data.vet_id) {
    const memberCheck = await validateMemberInOrg(
      supabase,
      parsed.data.vet_id,
      orgId
    );
    if (!memberCheck.ok) {
      return { success: false, error: memberCheck.error };
    }
  }

  const { data, error } = await supabase
    .from("dewormings")
    .insert({
      org_id: orgId,
      pet_id: parsed.data.pet_id,
      clinical_record_id: parsed.data.clinical_record_id || null,
      vet_id: parsed.data.vet_id || null,
      type: parsed.data.type,
      date_administered: parsed.data.date_administered,
      product: parsed.data.product || null,
      // Si viene vacío, el trigger SQL calcula el next_due_date.
      next_due_date: parsed.data.next_due_date || null,
      pregnant_cohabitation: parsed.data.pregnant_cohabitation ?? false,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: formatSupabaseError(error) };
  }

  revalidateDewormings(basePath);
  return { success: true, data: data as Deworming };
}

export async function updateDeworming(
  dewormingId: string,
  input: DewormingInput,
  basePath?: string
): Promise<ActionResult<Deworming>> {
  const parsed = dewormingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos invalidos" };
  }

  const { supabase } = await getAuthUser();

  const { data: existing } = await supabase
    .from("dewormings")
    .select("org_id")
    .eq("id", dewormingId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Desparasitación no encontrada" };
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("org_id")
    .eq("id", parsed.data.pet_id)
    .maybeSingle();

  if (!pet || pet.org_id !== existing.org_id) {
    return { success: false, error: "Mascota no válida" };
  }

  if (parsed.data.vet_id) {
    const memberCheck = await validateMemberInOrg(
      supabase,
      parsed.data.vet_id,
      existing.org_id
    );
    if (!memberCheck.ok) {
      return { success: false, error: memberCheck.error };
    }
  }

  const { data, error } = await supabase
    .from("dewormings")
    .update({
      clinical_record_id: parsed.data.clinical_record_id || null,
      vet_id: parsed.data.vet_id || null,
      type: parsed.data.type,
      date_administered: parsed.data.date_administered,
      product: parsed.data.product || null,
      next_due_date: parsed.data.next_due_date || null,
      pregnant_cohabitation: parsed.data.pregnant_cohabitation ?? false,
      notes: parsed.data.notes || null,
    })
    .eq("id", dewormingId)
    .select()
    .single();

  if (error) {
    return { success: false, error: formatSupabaseError(error) };
  }

  revalidateDewormings(basePath);
  return { success: true, data: data as Deworming };
}

export async function deleteDeworming(
  dewormingId: string,
  basePath?: string
): Promise<ActionResult> {
  const { supabase } = await getAuthUser();

  const { data: existing } = await supabase
    .from("dewormings")
    .select("id")
    .eq("id", dewormingId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Desparasitación no encontrada" };
  }

  const { error } = await supabase
    .from("dewormings")
    .delete()
    .eq("id", dewormingId);

  if (error) {
    return { success: false, error: formatSupabaseError(error) };
  }

  revalidateDewormings(basePath);
  return { success: true, data: undefined };
}

export async function getVetsForDewormings(
  orgId: string
): Promise<
  ActionResult<Pick<OrganizationMember, "id" | "first_name" | "last_name">[]>
> {
  const { supabase } = await getAuthUser();

  const { data, error } = await supabase
    .from("organization_members")
    .select("id, first_name, last_name")
    .eq("org_id", orgId)
    .eq("active", true)
    .in("role", ["admin", "vet"])
    .order("last_name", { ascending: true });

  if (error) {
    return { success: false, error: formatSupabaseError(error) };
  }

  return { success: true, data: data ?? [] };
}
