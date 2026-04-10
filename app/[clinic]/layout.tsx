import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClinicProvider } from "@/lib/context/clinic-context";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import type { Organization, OrganizationMember } from "@/types";

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
        created_at
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

  return (
    <ClinicProvider organization={org} member={member}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </ClinicProvider>
  );
}
