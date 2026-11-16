import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { PhoneForm } from "@/components/auth/phone-form";
import { safeNextPath } from "@/lib/auth-flow";

export const metadata: Metadata = { title: "Continue with your phone" };

export default async function PhonePage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string }> }) {
  const { mode, next } = await searchParams;
  const m = mode === "sign-up" ? "sign-up" : "sign-in";
  const n = next ? safeNextPath(next) : undefined;
  return (
    <AuthShell title={m === "sign-up" ? "Sign up with" : "Sign in with"} accent="phone" subtitle="We text you a 6-digit code. No password to remember.">
      <PhoneForm mode={m} next={n} />
      <p className="text-center text-sm text-muted">
        {m === "sign-up" ? "Already have an account? " : "New here? "}
        <Link className="inline-flex min-h-11 items-center font-semibold text-link underline underline-offset-4" href={m === "sign-up" ? "/sign-in" : "/sign-up"}>{m === "sign-up" ? "Sign in" : "Sign up"}</Link>
      </p>
    </AuthShell>
  );
}
