"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  teamMemberSchema,
  type TeamMemberInput,
} from "@/lib/validations/team-members";
import { createAndSendInvitation } from "@/lib/invitations/service";
import {
  revokeMemberAccess,
  restoreMemberAccess,
} from "@/lib/auth/revoke-member-access";
import type {
  OrganizationMember,
  MemberCapability,
  MemberWeeklySchedule,
  MemberScheduleBlock,
} from "@/types";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

// Guard para mutaciones restringidas a admin. Defense in depth: además de RLS
// en DB, validamos explícitamente el rol del caller y que el target pertenezca
// a la misma org. Esto convierte los escenarios silenciosos de RLS (0 filas,
// sin error) en mensajes accionables.
async function requireAdminForMember(memberId: string): Promise<
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      orgId: string;
    }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: caller } = await supabase
    .from("organization_members")
    .select("role, org_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!caller || caller.role !== "admin") {
    return {
      ok: false,
      error: "Solo los admin pueden modificar esta configuración",
    };
  }

  const { data: target } = await supabase
    .from("organization_members")
    .select("id, org_id")
    .eq("id", memberId)
    .maybeSingle();

  if (!target || target.org_id !== caller.org_id) {
    return { ok: false, error: "Miembro no pertenece a esta clínica" };
  }

  return { ok: true, supabase, orgId: caller.org_id };
}

export async function getTeamMembers(
  orgId: string
): Promise<ActionResult<OrganizationMember[]>> {
  const { supabase } = await getAuthContext();

  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("org_id", orgId)
    .order("active", { ascending: false })
    .order("first_name", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as OrganizationMember[] };
}

export async function getTeamMember(
  memberId: string
): Promise<ActionResult<OrganizationMember>> {
  const { supabase } = await getAuthContext();

  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("id", memberId)
    .single();

  if (error || !data) {
    return { success: false, error: "Miembro no encontrado" };
  }

  return { success: true, data: data as OrganizationMember };
}

export async function createTeamMember(
  orgId: string,
  clinicSlug: string,
  input: TeamMemberInput
): Promise<ActionResult<{ id: string; invited: boolean }>> {
  const parsed = teamMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await getAuthContext();

  const { data, error } = await supabase
    .from("organization_members")
    .insert({
      org_id: orgId,
      user_id: null,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name || null,
      role: parsed.data.role,
      specialty: parsed.data.specialty || null,
      active: true,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  let invited = false;
  const email = parsed.data.email?.trim();
  if (email) {
    const inviteRes = await createAndSendInvitation({
      memberId: data.id,
      email,
      invitedBy: user.id,
    });
    if (!inviteRes.success) {
      revalidatePath(`/${clinicSlug}/settings/team`);
      return {
        success: false,
        error: `Miembro creado, pero falló el envío: ${inviteRes.error}`,
      };
    }
    invited = true;
  }

  revalidatePath(`/${clinicSlug}/settings/team`);
  return { success: true, data: { id: data.id, invited } };
}

export async function inviteExistingMember(
  memberId: string,
  clinicSlug: string,
  email: string
): Promise<ActionResult> {
  const { user } = await getAuthContext();

  const result = await createAndSendInvitation({
    memberId,
    email: email.trim(),
    invitedBy: user.id,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/${clinicSlug}/settings/team`);
  return { success: true, data: undefined };
}

export async function updateTeamMember(
  memberId: string,
  clinicSlug: string,
  input: TeamMemberInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = teamMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { supabase } = await getAuthContext();

  const { data, error } = await supabase
    .from("organization_members")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name || null,
      role: parsed.data.role,
      specialty: parsed.data.specialty || null,
    })
    .eq("id", memberId)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${clinicSlug}/settings/team`);
  return { success: true, data: { id: data.id } };
}

export async function toggleMemberActive(
  memberId: string,
  clinicSlug: string,
  active: boolean
): Promise<ActionResult<{ sessionClosed: boolean }>> {
  await getAuthContext();

  if (active) {
    const result = await restoreMemberAccess(memberId);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    revalidatePath(`/${clinicSlug}/settings/team`);
    return { success: true, data: { sessionClosed: false } };
  }

  const result = await revokeMemberAccess(memberId);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/${clinicSlug}/settings/team`);
  return { success: true, data: { sessionClosed: result.sessionClosed } };
}

export async function getMemberCapabilities(
  memberId: string
): Promise<ActionResult<MemberCapability[]>> {
  const { supabase } = await getAuthContext();

  const { data, error } = await supabase
    .from("member_capabilities")
    .select("capability")
    .eq("member_id", memberId);

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: (data ?? []).map((r) => r.capability as MemberCapability),
  };
}

// Devuelve un mapa { memberId -> capabilities[] } para todos los miembros de
// la org. Usado por el listado de equipo y el form de citas para evitar N+1
// queries y para mostrar el doble rol de un solo viaje.
export async function getOrgCapabilitiesMap(
  orgId: string
): Promise<ActionResult<Record<string, MemberCapability[]>>> {
  const { supabase } = await getAuthContext();

  const { data, error } = await supabase
    .from("member_capabilities")
    .select("member_id, capability")
    .eq("org_id", orgId);

  if (error) {
    return { success: false, error: error.message };
  }

  const map: Record<string, MemberCapability[]> = {};
  for (const row of data ?? []) {
    const memberId = row.member_id as string;
    const cap = row.capability as MemberCapability;
    if (!map[memberId]) map[memberId] = [];
    map[memberId].push(cap);
  }
  return { success: true, data: map };
}

export async function updateMemberCapabilities(
  memberId: string,
  clinicSlug: string,
  capabilities: { can_vet: boolean; can_groom: boolean }
): Promise<ActionResult<void>> {
  const guard = await requireAdminForMember(memberId);
  if (!guard.ok) {
    return { success: false, error: guard.error };
  }
  const { supabase, orgId } = guard;

  const ALL_CAPS: MemberCapability[] = ["can_vet", "can_groom"];
  const desired: MemberCapability[] = [];
  if (capabilities.can_vet) desired.push("can_vet");
  if (capabilities.can_groom) desired.push("can_groom");
  const undesired = ALL_CAPS.filter((c) => !desired.includes(c));

  // Sin ventana vacía: primero upsert las deseadas (idempotente por PK),
  // luego borramos solo las no deseadas. Si el proceso muere a mitad de
  // camino, el miembro conserva capabilities válidas — nunca queda en
  // estado "sin capabilities" mientras se reconfiguran.
  if (desired.length > 0) {
    const { data: upserted, error: upsertError } = await supabase
      .from("member_capabilities")
      .upsert(
        desired.map((cap) => ({
          member_id: memberId,
          org_id: orgId,
          capability: cap,
        })),
        { onConflict: "member_id,capability" }
      )
      .select("member_id");

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }
    if (!upserted || upserted.length !== desired.length) {
      return {
        success: false,
        error: "No se pudieron guardar todas las capacidades.",
      };
    }
  }

  if (undesired.length > 0) {
    const { error: delError } = await supabase
      .from("member_capabilities")
      .delete()
      .eq("member_id", memberId)
      .in("capability", undesired)
      .select("member_id");

    if (delError) {
      return { success: false, error: delError.message };
    }
  }

  revalidatePath(`/${clinicSlug}/settings/team`);
  revalidatePath(`/${clinicSlug}/settings/team/${memberId}/edit`);
  return { success: true, data: undefined };
}

// ============================================================================
// Horarios de atención semanales y bloqueos puntuales
// ============================================================================

export async function getMemberSchedule(
  memberId: string
): Promise<
  ActionResult<{
    weekly: MemberWeeklySchedule[];
    blocks: MemberScheduleBlock[];
  }>
> {
  const { supabase } = await getAuthContext();

  const today = new Date().toISOString().slice(0, 10);
  const [weeklyRes, blocksRes] = await Promise.all([
    supabase
      .from("member_weekly_schedules")
      .select("*")
      .eq("member_id", memberId)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("member_schedule_blocks")
      .select("*")
      .eq("member_id", memberId)
      .gte("end_date", today)
      .order("start_date", { ascending: true }),
  ]);

  if (weeklyRes.error) {
    return { success: false, error: weeklyRes.error.message };
  }
  if (blocksRes.error) {
    return { success: false, error: blocksRes.error.message };
  }

  return {
    success: true,
    data: {
      weekly: (weeklyRes.data ?? []) as MemberWeeklySchedule[],
      blocks: (blocksRes.data ?? []) as MemberScheduleBlock[],
    },
  };
}

type ScheduleSlot = { day_of_week: number; start_time: string; end_time: string };

export async function replaceMemberWeeklySchedule(
  memberId: string,
  clinicSlug: string,
  slots: ScheduleSlot[]
): Promise<ActionResult<void>> {
  for (const s of slots) {
    if (s.day_of_week < 0 || s.day_of_week > 6) {
      return { success: false, error: "Día inválido" };
    }
    if (s.start_time >= s.end_time) {
      return { success: false, error: "La hora de inicio debe ser menor a la de fin" };
    }
  }

  const guard = await requireAdminForMember(memberId);
  if (!guard.ok) {
    return { success: false, error: guard.error };
  }
  const { supabase, orgId } = guard;

  const { error: delError } = await supabase
    .from("member_weekly_schedules")
    .delete()
    .eq("member_id", memberId)
    .select("id");

  if (delError) {
    return { success: false, error: delError.message };
  }

  if (slots.length > 0) {
    const { data: inserted, error: insError } = await supabase
      .from("member_weekly_schedules")
      .insert(
        slots.map((s) => ({
          org_id: orgId,
          member_id: memberId,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
        }))
      )
      .select("id");

    if (insError) {
      return { success: false, error: insError.message };
    }
    if (!inserted || inserted.length !== slots.length) {
      return {
        success: false,
        error: "No se pudieron guardar todos los tramos horarios.",
      };
    }
  }

  revalidatePath(`/${clinicSlug}/settings/team/${memberId}/edit`);
  revalidatePath(`/${clinicSlug}/appointments`);
  return { success: true, data: undefined };
}

export async function addMemberScheduleBlock(
  memberId: string,
  clinicSlug: string,
  input: { start_date: string; end_date: string; reason: string | null }
): Promise<ActionResult<{ id: string }>> {
  if (!input.start_date || !input.end_date) {
    return { success: false, error: "Debes indicar fecha de inicio y fin" };
  }
  if (input.start_date > input.end_date) {
    return {
      success: false,
      error: "La fecha de inicio debe ser anterior o igual a la de fin",
    };
  }

  const guard = await requireAdminForMember(memberId);
  if (!guard.ok) {
    return { success: false, error: guard.error };
  }
  const { supabase, orgId } = guard;

  const { data, error } = await supabase
    .from("member_schedule_blocks")
    .insert({
      org_id: orgId,
      member_id: memberId,
      start_date: input.start_date,
      end_date: input.end_date,
      reason: input.reason,
    })
    .select("id");

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return {
      success: false,
      error: "No se pudo guardar el bloqueo (sin permisos).",
    };
  }

  revalidatePath(`/${clinicSlug}/settings/team/${memberId}/edit`);
  revalidatePath(`/${clinicSlug}/appointments`);
  return { success: true, data: { id: data[0].id } };
}

export async function deleteMemberScheduleBlock(
  blockId: string,
  memberId: string,
  clinicSlug: string
): Promise<ActionResult<void>> {
  const guard = await requireAdminForMember(memberId);
  if (!guard.ok) {
    return { success: false, error: guard.error };
  }
  const { supabase } = guard;

  const { data, error } = await supabase
    .from("member_schedule_blocks")
    .delete()
    .eq("id", blockId)
    .select("id");

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return {
      success: false,
      error: "No se pudo eliminar el bloqueo (ya eliminado o sin permisos).",
    };
  }

  revalidatePath(`/${clinicSlug}/settings/team/${memberId}/edit`);
  revalidatePath(`/${clinicSlug}/appointments`);
  return { success: true, data: undefined };
}
