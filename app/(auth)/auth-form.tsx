"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import type { AuthState } from "./actions";

type Props = {
  action: (s: AuthState, f: FormData) => Promise<AuthState>;
  mode: "sign-in" | "sign-up";
  next?: string;
};

export function AuthForm({ action, mode, next }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const up = mode === "sign-up";
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {up && (
        <Field label="Full name" htmlFor="full_name" error={fe.full_name}>
          <Input id="full_name" name="full_name" autoComplete="name" aria-invalid={!!fe.full_name} required />
        </Field>
      )}
      <Field label="Email" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" aria-invalid={!!fe.email} required />
      </Field>
      <Field label="Password" htmlFor="password" error={fe.password}>
        <Input id="password" name="password" type="password" autoComplete={up ? "new-password" : "current-password"} aria-invalid={!!fe.password} required />
      </Field>
      {up && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">I am joining as</legend>
          {[["tenant", "A tenant looking for a house"], ["landlord", "A landlord or house owner"]].map(([v, l], i) => (
            <label key={v} className="flex min-h-11 items-center gap-3 rounded-md border border-border px-3">
              <input type="radio" name="role" value={v} defaultChecked={i === 0} className="size-4 accent-[var(--primary)]" />
              {l}
            </label>
          ))}
          <p className="text-sm text-muted">You can add the other role later from your account.</p>
        </fieldset>
      )}
      {state.error && <p role="alert" className="text-sm font-medium">Error: {state.error}</p>}
      {state.message && <p role="status" className="text-sm font-medium">{state.message}</p>}
      <Button type="submit" size="lg" className="w-full" loading={pending}>{up ? "Create account" : "Sign in"}</Button>
      <p className="text-center text-sm text-muted">
        {up ? "Already have an account? " : "New to E.Rent? "}
        <Link className="font-medium text-foreground underline underline-offset-4" href={up ? "/sign-in" : "/sign-up"}>{up ? "Sign in" : "Create an account"}</Link>
      </p>
    </form>
  );
}
