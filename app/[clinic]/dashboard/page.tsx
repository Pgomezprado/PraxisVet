import { createClient } from "@/lib/supabase/server";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { VetDashboard } from "@/components/dashboard/vet-dashboard";
import { ReceptionistDashboard } from "@/components/dashboard/receptionist-dashboard";
import { GroomerDashboard } from "@/components/dashboard/groomer-dashboard";
import {
  getDashboardCounts,
  getDayAgenda,
  getDayRevenue,
  getMonthRevenue,
  getMyDayStats,
  getNextAppointment,
  getPendingPayments,
  getRecentClients,
  getUrgentAttention,
  getWaitingRoom,
} from "./queries";
import type { Organization, OrganizationMember } from "@/types";

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
    const [counts, monthRevenue, dayRevenue, agenda, recentClients, urgent, pendingPayments] =
      await Promise.all([
        getDashboardCounts(supabase, org.id),
        getMonthRevenue(supabase, org.id),
        getDayRevenue(supabase, org.id),
        getDayAgenda(supabase, org.id),
        getRecentClients(supabase, org.id, 5),
        getUrgentAttention(supabase, org.id),
        getPendingPayments(supabase, org.id, 5),
      ]);

    return (
      <AdminDashboard
        organization={org}
        member={member}
        counts={counts}
        monthRevenue={monthRevenue}
        dayRevenue={dayRevenue}
        agenda={agenda}
        recentClients={recentClients}
        urgent={urgent}
        pendingPayments={pendingPayments}
      />
    );
  }

  if (member.role === "vet") {
    const [stats, agenda, nextAppointment] = await Promise.all([
      getMyDayStats(supabase, org.id, member.id),
      getDayAgenda(supabase, org.id, {
        assignedTo: member.id,
        type: "medical",
      }),
      getNextAppointment(supabase, org.id, {
        assignedTo: member.id,
        type: "medical",
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
    const [counts, dayRevenue, agenda, waitingRoom, urgent, pendingPayments] =
      await Promise.all([
        getDashboardCounts(supabase, org.id),
        getDayRevenue(supabase, org.id),
        getDayAgenda(supabase, org.id),
        getWaitingRoom(supabase, org.id),
        getUrgentAttention(supabase, org.id),
        getPendingPayments(supabase, org.id, 5),
      ]);

    return (
      <ReceptionistDashboard
        organization={org}
        member={member}
        counts={{
          appointmentsToday: counts.appointmentsToday,
          totalClients: counts.totalClients,
        }}
        dayRevenue={dayRevenue}
        agenda={agenda}
        waitingRoom={waitingRoom}
        urgent={urgent}
        pendingPayments={pendingPayments}
      />
    );
  }

  if (member.role === "groomer") {
    const [stats, agenda, nextAppointment] = await Promise.all([
      getMyDayStats(supabase, org.id, member.id),
      getDayAgenda(supabase, org.id, {
        assignedTo: member.id,
        type: "grooming",
      }),
      getNextAppointment(supabase, org.id, {
        assignedTo: member.id,
        type: "grooming",
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
