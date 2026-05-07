"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createPlatformAdminClient } from "@/lib/supabase/platform-admin.server";
import {
  requirePlatformAdmin,
  requireAal2,
  PlatformAdminAccessDenied,
} from "@/lib/superadmin/guards";
import { logSuperadminAction } from "@/lib/superadmin/audit";

export type DeleteOrgResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteOrganization(
  orgId: string,
  typedSlug: string,
): Promise<DeleteOrgResult> {
  let ctx;
  try {
    ctx = await requirePlatformAdmin();
    await requireAal2();
  } catch (err) {
    if (err instanceof PlatformAdminAccessDenied) {
      return { success: false, error: "Acceso denegado." };
    }
    throw err;
  }

  if (ctx.role !== "owner") {
    return {
      success: false,
      error: "Solo un owner puede eliminar clínicas.",
    };
  }

  const admin = createPlatformAdminClient();

  const { data: org, error: fetchErr } = await admin
    .from("organizations")
    .select("id, name, slug")
    .eq("id", orgId)
    .maybeSingle();

  if (fetchErr) {
    return { success: false, error: `No se pudo leer la clínica: ${fetchErr.message}` };
  }
  if (!org) {
    return { success: false, error: "La clínica ya no existe." };
  }

  if (typedSlug.trim() !== org.slug) {
    return {
      success: false,
      error: `Para confirmar, escribe exactamente el slug: ${org.slug}`,
    };
  }

  const { error: delErr } = await admin
    .from("organizations")
    .delete()
    .eq("id", orgId)
    .select("id");

  if (delErr) {
    await logSuperadminAction({
      action: "delete_org",
      actorUserId: ctx.userId,
      actorEmail: ctx.email,
      orgId,
      metadata: {
        org_name: org.name,
        org_slug: org.slug,
        success: false,
        error: delErr.message,
      },
    });
    return {
      success: false,
      error: `No se pudo eliminar: ${delErr.message}`,
    };
  }

  await logSuperadminAction({
    action: "delete_org",
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
    orgId,
    metadata: {
      org_name: org.name,
      org_slug: org.slug,
      success: true,
    },
  });

  revalidatePath("/superadmin");
  redirect("/superadmin");
}
