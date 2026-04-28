"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  clinicSettingsSchema,
  type ClinicSettingsInput,
} from "@/lib/validations/clinic-settings";
import type {
  MemberRole,
  MemberWeeklySchedule,
  Organization,
} from "@/types";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface TeamScheduleOverviewMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: MemberRole;
  specialty: string | null;
  schedules: Pick<
    MemberWeeklySchedule,
    "id" | "day_of_week" | "start_time" | "end_time"
  >[];
}

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

// Devuelve el panorama de horarios de los profesionales que atienden citas
// (vet/groomer activos) en una sola query. La RLS de
// member_weekly_schedules ya restringe por org, así que filtramos por
// org_id derivado del slug y nos apoyamos en la relación FK para el join.
export async function getTeamSchedulesOverview(
  orgSlug: string
): Promise<ActionResult<TeamScheduleOverviewMember[]>> {
  const { supabase } = await getAuthUser();

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (orgError || !org) {
    return { success: false, error: "Clínica no encontrada" };
  }

  const { data, error } = await supabase
    .from("organization_members")
    .select(
      `
        id,
        first_name,
        last_name,
        role,
        specialty,
        schedules:member_weekly_schedules (
          id,
          day_of_week,
          start_time,
          end_time
        )
      `
    )
    .eq("org_id", org.id)
    .eq("active", true)
    .in("role", ["vet", "groomer"])
    .order("first_name", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  const members = (data ?? []).map((m) => ({
    id: m.id as string,
    first_name: m.first_name as string | null,
    last_name: m.last_name as string | null,
    role: m.role as MemberRole,
    specialty: m.specialty as string | null,
    schedules: ((m.schedules ?? []) as TeamScheduleOverviewMember["schedules"])
      .slice()
      .sort((a, b) => {
        if (a.day_of_week !== b.day_of_week)
          return a.day_of_week - b.day_of_week;
        return a.start_time.localeCompare(b.start_time);
      }),
  }));

  // Solo los que tienen al menos un tramo configurado.
  const withSchedules = members.filter((m) => m.schedules.length > 0);

  return { success: true, data: withSchedules };
}
