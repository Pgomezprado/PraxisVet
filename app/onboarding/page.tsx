import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user already belongs to an organization
  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_id, organizations(slug)")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .single();

  if (membership?.organizations) {
    const org = membership.organizations as unknown as { slug: string };
    redirect(`/${org.slug}/dashboard`);
  }

  return <OnboardingForm />;
}
