import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { postAuthPath } from "@/lib/auth-flow";

/** Finishes email confirmation, password reset and Google sign-in links, then sends the person on. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const nextParam = searchParams.get("next") ?? "/account";
  const next = /^\/(?!\/)/.test(nextParam) ? nextParam : "/account";
  const supabase = await createClient();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;

  if (!ok) return NextResponse.redirect(`${origin}/sign-in?error=link`);
  // A password-reset link goes straight to its page; everything else may need the one-time "tenant or landlord" step
  const dest = next.startsWith("/reset-password") ? next : await postAuthPath(supabase, next);
  return NextResponse.redirect(`${origin}${dest}`);
}
