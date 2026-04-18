import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClinicProvider } from "@/lib/context/clinic-context";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { TrialBanner } from "@/components/billing/trial-banner";
import type { Organization, OrganizationMember } from "@/types";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ClinicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clinic: string }>;
}) {
  const { clinic } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Validate org exists and user is a member
  const { data: membership } = await supabase
    .from("organization_members")
    .select(
      `
      id,
      org_id,
      user_id,
      role,
      first_name,
      last_name,
      specialty,
      active,
      created_at,
      organizations!inner (
        id,
        name,
        slug,
        plan,
        email,
        phone,
        address,
        logo_url,
        settings,
        active,
        created_at,
        trial_started_at,
        trial_ends_at,
        subscription_status
      )
    `
    )
    .eq("user_id", user.id)
    .eq("active", true)
    .eq("organizations.slug", clinic)
    .single();

  if (!membership) {
    redirect("/onboarding");
  }

  const org = membership.organizations as unknown as Organization;
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

  // Trial / subscription gate. Platform admins bypass the check because they
  // may need to inspect expired orgs from the superadmin panel.
  const isPlatformAdmin = Boolean(user.app_metadata?.platform_admin);
  if (!isPlatformAdmin) {
    const trialEnded =
      org.subscription_status === "trial" &&
      org.trial_ends_at !== null &&
      new Date(org.trial_ends_at) <= new Date();

    if (trialEnded) {
      // Self-heal: persist the expired status so the cron + UI stay in sync.
      await supabase
        .from("organizations")
        .update({ subscription_status: "expired" })
        .eq("id", org.id);
      redirect("/billing/upgrade");
    }

    if (
      org.subscription_status === "expired" ||
      org.subscription_status === "past_due" ||
      org.subscription_status === "cancelled"
    ) {
      redirect("/billing/upgrade");
    }
  }

  const today = new Date().toISOString().split("T")[0];
  let appointmentsQuery = supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.id)
    .eq("date", today)
    .in("status", ["pending", "confirmed", "in_progress", "ready_for_pickup"]);

  if (member.role === "vet" || member.role === "groomer") {
    appointmentsQuery = appointmentsQuery.eq("assigned_to", member.id);
  }

  const { count: appointmentsTodayCount } = await appointmentsQuery;
  const appointmentsBadge = appointmentsTodayCount ?? 0;

  return (
    <ClinicProvider organization={org} member={member}>
      <SidebarProvider>
        <AppSidebar appointmentsBadge={appointmentsBadge} />
        <SidebarInset>
          <AppHeader />
          <TrialBanner
            trialEndsAt={org.trial_ends_at}
            subscriptionStatus={org.subscription_status}
          />
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </ClinicProvider>
  );
}
