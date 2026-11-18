import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SocialBlock } from "@/components/auth/social-block";
import { AuthForm } from "../auth-form";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ role?: string; next?: string }> }) {
  const { role, next } = await searchParams;
  return (
    <AuthShell title="Join" accent="E.Rent" subtitle="Free for tenants. Landlords list houses in minutes.">
      <AuthForm action={signUp} mode="sign-up" next={next} defaultRole={role === "landlord" ? "landlord" : "tenant"}><SocialBlock mode="sign-up" next={next} /></AuthForm>
    </AuthShell>
  );
}
