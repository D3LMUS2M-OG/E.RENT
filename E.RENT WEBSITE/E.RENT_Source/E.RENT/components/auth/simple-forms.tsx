"use client";

import { useActionState } from "react";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestPasswordReset, updatePassword, type AuthState } from "@/app/(auth)/actions";

const field = "min-h-12 w-full rounded-[14px] border border-border-strong bg-background/60 pl-11 pr-3.5 text-base text-foreground placeholder:text-muted aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger";

function Input({ id, label, icon: Icon, error, ...rest }: { id: string; label: string; icon: typeof Mail; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div className="relative"><Icon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden /><input id={id} name={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className={field} {...rest} /></div>
      {error && <p id={`${id}-error`} role="alert" className="text-sm font-medium">Error: {error}</p>}
    </div>
  );
}

export function ForgotPasswordForm() {
  const [s, action, pending] = useActionState(requestPasswordReset, {} as AuthState);
  return (
    <form action={action} className="space-y-5" noValidate>
      <Input id="email" label="Email address" icon={Mail} type="email" autoComplete="email" placeholder="name@example.com" error={s.fieldErrors?.email} />
      {s.message && <p role="status" className="msg-ok text-sm font-medium">{s.message}</p>}
      <Button type="submit" size="lg" className="w-full" loading={pending}>Send reset link{!pending && <ArrowRight className="size-5" aria-hidden />}</Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [s, action, pending] = useActionState(updatePassword, {} as AuthState);
  return (
    <form action={action} className="space-y-5" noValidate>
      <Input id="password" label="New password" icon={Lock} type="password" autoComplete="new-password" error={s.fieldErrors?.password} />
      <Input id="confirm" label="Type it again" icon={Lock} type="password" autoComplete="new-password" error={s.fieldErrors?.confirm} />
      {s.error && <p role="alert" className="text-sm font-medium">Error: {s.error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={pending}>Save new password{!pending && <ArrowRight className="size-5" aria-hidden />}</Button>
    </form>
  );
}
