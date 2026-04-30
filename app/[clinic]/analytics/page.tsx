import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PeriodSelector } from "./_components/period-selector";
import { AppointmentsChart } from "@/components/analytics/appointments-chart";
import { ProfessionalProductivityTable } from "@/components/analytics/professional-productivity-table";
import {
  getAppointmentsBreakdown,
  getProfessionalProductivity,
  resolvePeriod,
  type AnalyticsPeriod,
} from "./queries";

export const dynamic = "force-dynamic";

function parsePeriod(raw: string | string[] | undefined): AnalyticsPeriod {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "3m" || value === "year") return value;
  return "month";
}

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clinic: string }>;
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const [{ clinic }, sp] = await Promise.all([params, searchParams]);
  const period = parsePeriod(sp.period);
  const range = resolvePeriod(period);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select(
      `
      id, org_id, role, active,
      organizations!inner ( id, name, slug )
    `
    )
    .eq("user_id", user.id)
    .eq("active", true)
    .eq("organizations.slug", clinic)
    .single();

  if (!membership) redirect("/onboarding");
  if (membership.role !== "admin") redirect(`/${clinic}/dashboard`);

  const orgId = membership.org_id;

  const [appointments, productivity] = await Promise.all([
    getAppointmentsBreakdown(supabase, orgId, range),
    getProfessionalProductivity(supabase, orgId, range),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Vista general de tu clínica — {range.label.toLowerCase()}.
          </p>
        </div>
        <PeriodSelector current={period} />
      </div>

      <AppointmentsChart data={appointments} periodLabel={range.label} />

      <ProfessionalProductivityTable
        rows={productivity}
        periodLabel={range.label}
      />
    </div>
  );
}
