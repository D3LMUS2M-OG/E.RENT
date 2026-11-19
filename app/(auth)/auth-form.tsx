"use client";

import { useActionState, useState } from "react";
import { stagger } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthState } from "./actions";

type Props = { action: (s: AuthState, f: FormData) => Promise<AuthState>; mode: "sign-in" | "sign-up"; next?: string; defaultRole?: "tenant" | "landlord"; children?: React.ReactNode };

const wrap = "relative";
const field = "min-h-12 w-full rounded-[14px] border border-border-strong bg-background/60 pl-11 pr-3.5 text-base text-foreground placeholder:text-muted aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger";

function Row({ i, label, htmlFor, error, icon: Icon, children, trailing }: { i: number; label: string; htmlFor: string; error?: string; icon: typeof Mail; children: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <div style={stagger(i)} className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      <div className={wrap}><Icon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />{children}{trailing}</div>
      {error && <p id={`${htmlFor}-error`} role="alert" className="text-sm font-medium">Error: {error}</p>}
    </div>
  );
}

/** `children` is the optional "or continue with" block, rendered by the page (it needs the feature flags). */
export function AuthForm({ action, mode, next, defaultRole = "tenant", children }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [show, setShow] = useState(false);
  const up = mode === "sign-up";
  const fe = state.fieldErrors ?? {};

  return (
    <>
      <form action={formAction} className="stagger space-y-5" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        {up && <Row i={0} label="Full name" htmlFor="full_name" error={fe.full_name} icon={User}><input id="full_name" name="full_name" autoComplete="name" required aria-invalid={!!fe.full_name} aria-describedby={fe.full_name ? "full_name-error" : undefined} className={field} /></Row>}
        <Row i={1} label="Email address" htmlFor="email" error={fe.email} icon={Mail}><input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" required aria-invalid={!!fe.email} aria-describedby={fe.email ? "email-error" : undefined} className={field} /></Row>
        <Row i={2} label="Password" htmlFor="password" error={fe.password} icon={Lock}
          trailing={<button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} className="absolute right-1.5 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground">{show ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}</button>}>
          <input id="password" name="password" type={show ? "text" : "password"} autoComplete={up ? "new-password" : "current-password"} required aria-invalid={!!fe.password} aria-describedby={fe.password ? "password-error" : undefined} className={`${field} pr-12`} />
        </Row>

        {up && (
          <fieldset style={stagger(3)} className="space-y-2">
            <legend className="text-sm font-medium">I am joining as</legend>
            {[["tenant", "A tenant looking for a house"], ["landlord", "A landlord or house owner"]].map(([v, l], i) => (
              <label key={v} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[14px] border border-border bg-background/50 px-3.5 transition-colors has-[:checked]:border-primary has-[:checked]:bg-surface-2">
                <input type="radio" name="role" value={v} defaultChecked={v === defaultRole} className="size-4 accent-[var(--primary)]" />{l}
              </label>))}
          </fieldset>
        )}
        {!up && <div style={stagger(3)} className="-mt-1 flex justify-end"><Link href="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-medium text-link underline-offset-4 hover:underline">Forgot password?</Link></div>}

        <div style={stagger(4)} className="space-y-3">
          {up && <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="terms" required className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" /><span>I am 18 or older and I agree to the <Link href="/legal/terms" target="_blank" className="font-semibold text-link underline underline-offset-4">Terms of Service</Link> and the <Link href="/legal/privacy" target="_blank" className="font-semibold text-link underline underline-offset-4">Privacy Policy</Link>.</span></label>}
          {up && state.fieldErrors?.terms && <p role="alert" className="text-sm font-medium">Error: {state.fieldErrors.terms}</p>}
          {state.error && <p role="alert" className="text-sm font-medium">Error: {state.error}</p>}
          {state.message && <p role="status" className="msg-ok text-sm font-medium">{state.message}</p>}
          <Button type="submit" size="lg" className="w-full" loading={pending}>{up ? "Create account" : "Sign in"}{!pending && <ArrowRight className="size-5" aria-hidden />}</Button>
        </div>
      </form>

      {children}

      <p style={stagger(6)} className="text-center text-sm text-muted">
        {up ? "Already have an account? " : "Don’t have an account? "}
        <Link className="inline-flex min-h-11 items-center font-semibold text-link underline underline-offset-4" href={up ? "/sign-in" : "/sign-up"}>{up ? "Sign in" : "Sign up"}</Link>
      </p>
    </>
  );
}
