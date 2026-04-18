import { NextResponse } from "next/server";
import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin.server";
import { sendTrialReminderEmail } from "@/lib/email/trial-reminder";
import { REMINDER_DAYS } from "@/lib/billing/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://praxisvet.cl";

/**
 * Daily cron. Scans organizations in 'trial' state:
 *   - `trial_ends_at` in exactly REMINDER_DAYS[i] days → send reminder email.
 *   - `trial_ends_at` <= now → mark subscription_status='expired'.
 *
 * Auth: Bearer CRON_SECRET header (Vercel Cron injects it automatically when
 * `CRON_SECRET` is set as an env var in the project).
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const todayStart = startOfDay(now);

  // Pull all trials expiring in the next 8 days (covers our reminder windows + expirations)
  const horizon = addDays(todayStart, 8).toISOString();

  const { data: trials, error } = await supabase
    .from("organizations")
    .select("id, name, trial_ends_at")
    .eq("subscription_status", "trial")
    .lte("trial_ends_at", horizon);

  if (error) {
    return NextResponse.json(
      { error: `supabase: ${error.message}` },
      { status: 500 }
    );
  }

  let sent = 0;
  let expired = 0;
  let skipped = 0;

  for (const org of trials ?? []) {
    if (!org.trial_ends_at) {
      skipped++;
      continue;
    }
    const trialEndsAt = new Date(org.trial_ends_at);
    const daysLeft = differenceInCalendarDays(trialEndsAt, now);

    // Expired: mark and skip.
    if (daysLeft <= 0) {
      await supabase
        .from("organizations")
        .update({ subscription_status: "expired" })
        .eq("id", org.id);
      expired++;
      continue;
    }

    // Not a reminder day → skip.
    if (!REMINDER_DAYS.includes(daysLeft as (typeof REMINDER_DAYS)[number])) {
      skipped++;
      continue;
    }

    // Get the org's admin owner for the email.
    const { data: admin } = await supabase
      .from("organization_members")
      .select("user_id, first_name")
      .eq("org_id", org.id)
      .eq("role", "admin")
      .eq("active", true)
      .not("user_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (!admin?.user_id) {
      skipped++;
      continue;
    }

    const { data: userData } = await supabase.auth.admin.getUserById(
      admin.user_id
    );
    const email = userData?.user?.email;
    if (!email) {
      skipped++;
      continue;
    }

    try {
      await sendTrialReminderEmail({
        to: email,
        orgName: org.name,
        inviteeName: admin.first_name ?? "",
        daysLeft,
        upgradeUrl: `${SITE_URL}/billing/upgrade`,
      });
      sent++;
    } catch (err) {
      console.error(
        `[cron/trial-reminders] email failed for org=${org.id}`,
        err
      );
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: trials?.length ?? 0,
    sent,
    expired,
    skipped,
  });
}
