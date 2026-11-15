import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SocialBlock } from "@/components/auth/social-block";
import { getFlags } from "@/lib/flags";
import { AuthForm } from "../auth-form";
import { signIn } from "../actions";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = { link: "That link has expired or was already used. Try again.", google: "Google sign-in did not complete. Try again." };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const flags = await getFlags();
  return (
    <AuthShell title="Welcome" accent="back" subtitle="Sign in to chat with landlords and manage your houses.">
      {error && ERRORS[error] && <p role="alert" className="text-sm font-medium">Error: {ERRORS[error]}</p>}
      <AuthForm action={signIn} mode="sign-in" next={next}>{flags.enable_google_login && <SocialBlock next={next} />}</AuthForm>
    </AuthShell>
  );
}
