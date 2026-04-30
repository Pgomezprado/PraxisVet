import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

const VALID_OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const { searchParams, origin } = url;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/onboarding";

  console.log("[auth/callback] hit", {
    fullUrl: request.url,
    hasCode: Boolean(code),
    hasTokenHash: Boolean(tokenHash),
    type,
    next,
    allParams: Object.fromEntries(searchParams.entries()),
  });

  const supabase = await createClient();

  let lastError: string | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      console.log("[auth/callback] exchangeCodeForSession OK → redirect", next);
      return NextResponse.redirect(new URL(next, origin));
    }
    lastError = `exchange:${error.message}`;
    console.error("[auth/callback] exchangeCodeForSession FAIL", error);
  } else if (tokenHash && type && VALID_OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      console.log("[auth/callback] verifyOtp OK → redirect", next);
      return NextResponse.redirect(new URL(next, origin));
    }
    lastError = `verifyOtp:${error.message}`;
    console.error("[auth/callback] verifyOtp FAIL", error);
  } else {
    lastError = "missing_code_and_token_hash";
    console.error("[auth/callback] missing code AND token_hash", {
      params: Object.fromEntries(searchParams.entries()),
    });
  }

  const fallback = new URL("/auth/login", origin);
  fallback.searchParams.set("error", "auth_callback_failed");
  if (process.env.NODE_ENV !== "production" && lastError) {
    fallback.searchParams.set("debug", lastError);
  }
  return NextResponse.redirect(fallback);
}
