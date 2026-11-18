import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/simple-forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <AuthShell title="Choose a new" accent="password" subtitle="Use at least 8 characters.">
      {user ? <ResetPasswordForm /> : (
        <div className="space-y-3">
          <p role="alert" className="text-sm font-medium">Error: This reset link has expired or was already used.</p>
          <Link href="/forgot-password" className="inline-flex min-h-11 items-center font-semibold text-link underline underline-offset-4">Ask for a new link</Link>
        </div>)}
    </AuthShell>
  );
}
