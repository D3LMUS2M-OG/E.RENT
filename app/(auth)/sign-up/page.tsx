import type { Metadata } from "next";
import { AuthForm } from "../auth-form";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Create an account" };

// Phone OTP and Google are built behind flags (see lib/flags.ts). Only email and password show at launch.
export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Create an account</h1>
      <AuthForm action={signUp} mode="sign-up" />
    </div>
  );
}
