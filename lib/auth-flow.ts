import type { SupabaseClient } from "@supabase/supabase-js";

/** Same-site paths only, so a redirect can never leave the site. */
export const safeNextPath = (v: unknown, fallback = "/account") => (typeof v === "string" && /^\/(?!\/)/.test(v) ? v : fallback);

/** After any sign-in: people who arrive through Google or a phone code for the first time are asked "Tenant or landlord?" once. */
export async function postAuthPath(supabase: SupabaseClient, next: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "/sign-in";
  const provider = (user.app_metadata?.provider as string | undefined) ?? "email";
  if (provider !== "email" && user.user_metadata?.onboarded !== true) return `/onboarding?next=${encodeURIComponent(next)}`;
  return next;
}
