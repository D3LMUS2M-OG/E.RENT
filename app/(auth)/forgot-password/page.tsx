import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/simple-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Forgot your" accent="password?" subtitle="Enter your email and we will send you a link to choose a new one.">
      <ForgotPasswordForm />
      <p className="text-center text-sm"><Link href="/sign-in" className="inline-flex min-h-11 items-center font-semibold text-link underline underline-offset-4">Back to sign in</Link></p>
    </AuthShell>
  );
}
