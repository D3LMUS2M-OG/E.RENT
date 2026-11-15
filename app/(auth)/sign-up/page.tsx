import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SocialBlock } from "@/components/auth/social-block";
import { getFlags } from "@/lib/flags";
import { AuthForm } from "../auth-form";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage() {
  const flags = await getFlags();
  return (
    <AuthShell title="Join" accent="E.Rent" subtitle="Free for tenants. Landlords list houses in minutes.">
      <AuthForm action={signUp} mode="sign-up">{flags.enable_google_login && <SocialBlock />}</AuthForm>
    </AuthShell>
  );
}
