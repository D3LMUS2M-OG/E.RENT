import type { Metadata } from "next";
import { AuthForm } from "../auth-form";
import { signIn } from "../actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Sign in</h1>
      <AuthForm action={signIn} mode="sign-in" next={next} />
    </div>
  );
}
