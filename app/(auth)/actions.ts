"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; fieldErrors?: Record<string, string>; message?: string };

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
});
const signUpSchema = credentials.extend({
  full_name: z.string().trim().min(2, "Enter your full name").max(80),
  role: z.enum(["tenant", "landlord"]),
});

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0])] ??= issue.message;
  return out;
}

// Only same-site paths, so the redirect cannot be used to leave the site.
const safeNext = (v: FormDataEntryValue | null) => (typeof v === "string" && /^\/(?!\/)/.test(v) ? v : "/account");

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message.toLowerCase().includes("confirm") ? "Confirm your email first. Check your inbox for the link." : "Email or password is incorrect" };
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const { email, password, full_name, role } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name, initial_role: role }, emailRedirectTo: `${SITE()}/auth/callback?next=/account` },
  });
  if (error) return { error: error.message };
  if (!data.session) return { message: "Check your email for a confirmation link, then sign in." };
  redirect("/account");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** Google sign-in. The button only appears when the enable_google_login flag is on. */
export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const next = safeNext(formData.get("next"));
  const { data } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${SITE()}/auth/callback?next=${encodeURIComponent(next)}` } });
  if (data?.url) redirect(data.url);
  redirect("/sign-in?error=google");
}

/** Always answers the same way, so nobody can use this form to find out who has an account. */
export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = z.string().trim().email("Enter a valid email address").safeParse(formData.get("email"));
  if (!email.success) return { fieldErrors: { email: email.error.issues[0].message } };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${SITE()}/auth/callback?next=/reset-password` });
  return { message: "If an account uses that email, a reset link is on its way. Check your inbox." };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? ""); const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { fieldErrors: { password: "Use at least 8 characters" } };
  if (password !== confirm) return { fieldErrors: { confirm: "The two passwords do not match" } };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "This reset link has expired. Ask for a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/account?password=updated");
}
