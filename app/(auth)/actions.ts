"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeKenyanPhone } from "@/lib/phone";
import { postAuthPath, safeNextPath } from "@/lib/auth-flow";

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

/** Google sign-in. */
export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const next = safeNext(formData.get("next"));
  const { data } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${SITE()}/auth/callback?next=${encodeURIComponent(next)}` } });
  if (data?.url) redirect(data.url);
  redirect(`/sign-in?error=google${next !== "/account" ? `&next=${encodeURIComponent(next)}` : ""}`);
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

// ───────── Phone sign-in and sign-up (one-time code by SMS) ─────────
export type PhoneState = { step?: "phone" | "code"; phone?: string; error?: string; fieldErrors?: Record<string, string>; message?: string };

/** Step 1: send the code. Sign-up mode also carries the name and role, which are saved when the account is created. */
export async function sendPhoneOtp(_: PhoneState, formData: FormData): Promise<PhoneState> {
  const phone = normalizeKenyanPhone(String(formData.get("phone") ?? ""));
  if (!phone) return { step: "phone", fieldErrors: { phone: "Enter a Kenyan number like 0712 345 678" } };
  const mode = formData.get("mode") === "sign-up" ? "sign-up" : "sign-in";
  const supabase = await createClient();

  if (mode === "sign-up") {
    const parsed = z.object({ full_name: z.string().trim().min(2, "Enter your full name").max(80), role: z.enum(["tenant", "landlord"]) }).safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { step: "phone", phone, fieldErrors: fieldErrors(parsed.error) };
    const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: true, channel: "sms", data: { full_name: parsed.data.full_name, initial_role: parsed.data.role, onboarded: true } } });
    if (error) return { step: "phone", phone, error: "We could not send the code. Check the number and try again." };
  } else {
    const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false, channel: "sms" } });
    if (error) {
      const noAccount = /signups? not allowed|not found|user/i.test(error.message);
      return { step: "phone", phone, error: noAccount ? "No account uses that number yet. Create one with Sign up." : "We could not send the code. Try again in a minute." };
    }
  }
  return { step: "code", phone, message: `We sent a 6-digit code to ${phone}.` };
}

/** Step 2: check the code, then go where the person was headed. */
export async function verifyPhoneOtp(_: PhoneState, formData: FormData): Promise<PhoneState> {
  const phone = String(formData.get("phone") ?? "");
  const token = String(formData.get("token") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return { step: "code", phone, fieldErrors: { token: "Enter the 6-digit code" } };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) return { step: "code", phone, error: "That code is wrong or has expired. Ask for a new one." };
  redirect(await postAuthPath(supabase, safeNextPath(formData.get("next"))));
}

// ───────── One-time "Tenant or landlord?" step after the first Google or phone sign-in ─────────
export async function completeOnboarding(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.object({ role: z.enum(["tenant", "landlord"]), full_name: z.string().trim().max(80).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Choose tenant or landlord" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  if (parsed.data.full_name && parsed.data.full_name.length >= 2) await supabase.from("profiles").update({ full_name: parsed.data.full_name }).eq("id", user.id);
  if (parsed.data.role === "landlord") {
    const { error } = await supabase.from("user_roles").upsert({ user_id: user.id, role: "landlord" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (error) return { error: "We could not save your choice. Try again." };
  }
  await supabase.auth.updateUser({ data: { onboarded: true } });
  const fallback = parsed.data.role === "landlord" ? "/dashboard" : "/";
  redirect(safeNextPath(formData.get("next") === "/account" ? fallback : formData.get("next"), fallback));
}

/** A signed-in tenant who wants to list houses: add the landlord role. */
export async function becomeLandlord(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first" };
  const { error } = await supabase.from("user_roles").upsert({ user_id: user.id, role: "landlord" }, { onConflict: "user_id,role", ignoreDuplicates: true });
  return error ? { error: "We could not add the landlord role. Try again." } : {};
}
