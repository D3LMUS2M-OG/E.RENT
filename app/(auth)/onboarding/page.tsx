import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth-flow";

export const metadata: Metadata = { title: "Welcome", robots: { index: false } };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  return (
    <AuthShell title="One quick" accent="question" subtitle="Are you here to find a house or to list one? You can add the other role later.">
      <OnboardingForm next={safeNextPath(next)} needsName={!(profile?.full_name ?? "").trim()} />
    </AuthShell>
  );
}
