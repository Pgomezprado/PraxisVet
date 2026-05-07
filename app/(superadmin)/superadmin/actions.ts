"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/superadmin/guards";

type ActionResult = { ok: true } | { ok: false; error: string };

const orgIdSchema = z.string().uuid({ message: "orgId inválido" });

const setFounderSchema = z.object({
  orgId: orgIdSchema,
  isFounder: z.boolean(),
});

const addNoteSchema = z.object({
  orgId: orgIdSchema,
  body: z
    .string()
    .trim()
    .min(1, "La nota no puede estar vacía")
    .max(2000, "La nota no puede superar 2000 caracteres"),
});

const togglePinSchema = z.object({
  noteId: z.string().uuid({ message: "noteId inválido" }),
  orgId: orgIdSchema.optional(),
});

/**
 * Marca/desmarca una clínica como fundadora.
 * El RPC ya valida platform admin y audita la acción.
 */
export async function setFounderAction(
  orgId: string,
  isFounder: boolean,
): Promise<ActionResult> {
  const parsed = setFounderSchema.safeParse({ orgId, isFounder });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await requirePlatformAdmin();
  } catch {
    return { ok: false, error: "Acceso denegado" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("superadmin_set_founder", {
    p_org_id: parsed.data.orgId,
    p_is_founder: parsed.data.isFounder,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/superadmin", "layout");

  return { ok: true };
}

/**
 * Agrega una nota comercial a la clínica.
 * El RPC ya audita la acción y setea created_by = auth.uid().
 */
export async function addClinicNoteAction(
  orgId: string,
  body: string,
): Promise<ActionResult> {
  const parsed = addNoteSchema.safeParse({ orgId, body });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await requirePlatformAdmin();
  } catch {
    return { ok: false, error: "Acceso denegado" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("superadmin_add_clinic_note", {
    p_org_id: parsed.data.orgId,
    p_body: parsed.data.body,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/superadmin", "layout");
  return { ok: true };
}

/**
 * Toggle del pin de una nota comercial.
 * El RPC valida platform admin, audita la acción y devuelve el nuevo valor de is_pinned.
 */
export async function togglePinNoteAction(
  noteId: string,
  orgId?: string,
): Promise<ActionResult> {
  const parsed = togglePinSchema.safeParse({ noteId, orgId });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await requirePlatformAdmin();
  } catch {
    return { ok: false, error: "Acceso denegado" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("superadmin_toggle_pin_note", {
    p_note_id: parsed.data.noteId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/superadmin", "layout");
  return { ok: true };
}
