import { createClient } from "@/lib/supabase/server";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { VetDashboard } from "@/components/dashboard/vet-dashboard";
import { ReceptionistDashboard } from "@/components/dashboard/receptionist-dashboard";
import { GroomerDashboard } from "@/components/dashboard/groomer-dashboard";
import {
  getDashboardCounts,
  getDayAgenda,
  getMyDayStats,
  getNextAppointment,
  getOnboardingStatus,
  getRecentClients,
  getUrgentAttention,
  getWaitingRoom,
  getWeekAgenda,
} from "./queries";
import type { MemberCapability, Organization, OrganizationMember } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ clinic: string }>;
}) {
  const { clinic } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select(
      `
      id, org_id, user_id, role, first_name, last_name, specialty, active, created_at,
      organizations!inner ( id, name, slug, plan, email, phone, address, logo_url, settings, active, created_at )
    `
    )
    .eq("user_id", user.id)
    .eq("active", true)
    .eq("organizations.slug", clinic)
    .single();

  if (!membership) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">No se encontró la organización.</p>
      </div>
    );
  }

  const org = (membership.organizations as unknown) as Organization;
  const member: OrganizationMember = {
    id: membership.id,
    org_id: membership.org_id,
    user_id: membership.user_id,
    role: membership.role as OrganizationMember["role"],
    first_name: membership.first_name,
    last_name: membership.last_name,
    specialty: membership.specialty,
    active: membership.active,
    created_at: membership.created_at,
  };

  // Fetch data según rol — reusa la misma instancia de supabase.
  if (member.role === "admin") {
    const [counts, recentClients, urgent, onboarding] =
      await Promise.all([
        getDashboardCounts(supabase, org.id),
        getRecentClients(supabase, org.id, 5),
        getUrgentAttention(supabase, org.id),
        getOnboardingStatus(supabase, org.id),
      ]);

    return (
      <AdminDashboard
        organization={org}
        member={member}
        counts={counts}
        recentClients={recentClients}
        urgent={urgent}
        onboarding={onboarding}
      />
    );
  }

  // Capacidades extras (member_capabilities). Si una vet tiene can_groom o un
  // groomer tiene can_vet, su dashboard debe mostrar AMBOS tipos de cita —
  // no solo las de su rol base. Sin esto, sus citas de la otra disciplina se
  // vuelven invisibles desde su panel.
  const { data: caps } = await supabase
    .from("member_capabilities")
    .select("capability")
    .eq("member_id", member.id);
  const capabilities = (caps ?? []).map(
    (r) => r.capability as MemberCapability
  );

  if (member.role === "vet") {
    // Una vet con can_groom atiende ambos tipos → omitimos el filtro de tipo
    // para que su dashboard incluya también sus citas de peluquería.
    const typeFilter = capabilities.includes("can_groom")
      ? undefined
      : ("medical" as const);
    const [stats, agenda, nextAppointment] = await Promise.all([
      getMyDayStats(supabase, org.id, member.id, { type: typeFilter }),
      getWeekAgenda(supabase, org.id, {
        assignedTo: member.id,
        type: typeFilter,
      }),
      getNextAppointment(supabase, org.id, {
        assignedTo: member.id,
        type: typeFilter,
      }),
    ]);

    return (
      <VetDashboard
        organization={org}
        member={member}
        stats={stats}
        agenda={agenda}
        nextAppointment={nextAppointment}
      />
    );
  }

  if (member.role === "receptionist") {
    const [counts, agenda, waitingRoom, urgent] =
      await Promise.all([
        getDashboardCounts(supabase, org.id),
        getDayAgenda(supabase, org.id),
        getWaitingRoom(supabase, org.id),
        getUrgentAttention(supabase, org.id),
      ]);

    return (
      <ReceptionistDashboard
        organization={org}
        member={member}
        counts={{
          appointmentsToday: counts.appointmentsToday,
          totalClients: counts.totalClients,
        }}
        agenda={agenda}
        waitingRoom={waitingRoom}
        urgent={urgent}
      />
    );
  }

  if (member.role === "groomer") {
    // Simétrico al vet: un groomer con can_vet también atiende consultas, así
    // que dejamos pasar ambos tipos cuando aplica.
    const typeFilter = capabilities.includes("can_vet")
      ? undefined
      : ("grooming" as const);
    const [stats, agenda, nextAppointment] = await Promise.all([
      getMyDayStats(supabase, org.id, member.id, { type: typeFilter }),
      getDayAgenda(supabase, org.id, {
        assignedTo: member.id,
        type: typeFilter,
      }),
      getNextAppointment(supabase, org.id, {
        assignedTo: member.id,
        type: typeFilter,
      }),
    ]);

    return (
      <GroomerDashboard
        organization={org}
        member={member}
        stats={stats}
        agenda={agenda}
        nextAppointment={nextAppointment}
      />
    );
  }

  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-muted-foreground">
        Rol desconocido. Contacta al administrador.
      </p>
    </div>
  );
}
