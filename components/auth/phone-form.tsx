"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Phone, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendPhoneOtp, verifyPhoneOtp, type PhoneState } from "@/app/(auth)/actions";
import { stagger } from "@/lib/utils";

const field = "min-h-12 w-full rounded-[14px] border border-border-strong bg-background/60 pl-11 pr-3.5 text-base text-foreground placeholder:text-muted aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger";
const icon = "pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted";

/** Two steps: your number (and, when signing up, your name and role), then the 6-digit code we text you. */
export function PhoneForm({ mode, next }: { mode: "sign-in" | "sign-up"; next?: string }) {
  const [sent, sendAction, sending] = useActionState<PhoneState, FormData>(sendPhoneOtp, {});
  const [checked, verifyAction, verifying] = useActionState<PhoneState, FormData>(verifyPhoneOtp, {});
  const [seconds, setSeconds] = useState(0);
  const up = mode === "sign-up";
  const onCode = sent.step === "code";
  const fe = sent.fieldErrors ?? {};

  useEffect(() => { if (onCode) setSeconds(45); }, [onCode, sent]);
  useEffect(() => { if (seconds <= 0) return; const t = setTimeout(() => setSeconds((s) => s - 1), 1000); return () => clearTimeout(t); }, [seconds]);

  if (onCode) {
    return (
      <div className="space-y-5">
        <form action={verifyAction} className="stagger space-y-5" noValidate>
          <input type="hidden" name="phone" value={sent.phone} />{next && <input type="hidden" name="next" value={next} />}
          <p role="status" className="msg-ok text-sm font-medium">{sent.message}</p>
          <div style={stagger(1)} className="space-y-1.5">
            <label htmlFor="token" className="text-sm font-medium">6-digit code</label>
            <div className="relative"><ShieldCheck className={icon} aria-hidden />
              <input id="token" name="token" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" autoFocus required aria-invalid={!!checked.fieldErrors?.token}
                className={`${field} text-xl tracking-[0.5em]`} /></div>
            {checked.fieldErrors?.token && <p role="alert" className="text-sm font-medium">Error: {checked.fieldErrors.token}</p>}
          </div>
          {checked.error && <p role="alert" className="text-sm font-medium">Error: {checked.error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={verifying}>Verify and continue{!verifying && <ArrowRight className="size-5" aria-hidden />}</Button>
        </form>
        <form action={sendAction} className="flex items-center justify-between text-sm">
          <input type="hidden" name="phone" value={sent.phone} /><input type="hidden" name="mode" value={mode} />
          <span className="text-muted">Wrong number? <button type="button" onClick={() => location.reload()} className="font-semibold text-link underline underline-offset-4">Change it</button></span>
          <Button type="submit" variant="ghost" disabled={seconds > 0} loading={sending}>{seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}</Button>
        </form>
      </div>
    );
  }

  return (
    <form action={sendAction} className="stagger space-y-5" noValidate>
      <input type="hidden" name="mode" value={mode} />
      {up && (
        <div style={stagger(0)} className="space-y-1.5">
          <label htmlFor="full_name" className="text-sm font-medium">Full name</label>
          <div className="relative"><User className={icon} aria-hidden /><input id="full_name" name="full_name" autoComplete="name" required aria-invalid={!!fe.full_name} className={field} /></div>
          {fe.full_name && <p role="alert" className="text-sm font-medium">Error: {fe.full_name}</p>}
        </div>)}
      <div style={stagger(1)} className="space-y-1.5">
        <label htmlFor="phone" className="text-sm font-medium">Phone number</label>
        <div className="relative"><Phone className={icon} aria-hidden /><input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" required defaultValue={sent.phone} aria-invalid={!!fe.phone} className={field} /></div>
        {fe.phone && <p role="alert" className="text-sm font-medium">Error: {fe.phone}</p>}
      </div>
      {up && (
        <fieldset style={stagger(2)} className="space-y-2">
          <legend className="text-sm font-medium">I am joining as</legend>
          {[["tenant", "A tenant looking for a house"], ["landlord", "A landlord or house owner"]].map(([v, l], i) => (
            <label key={v} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[14px] border border-border bg-background/50 px-3.5 transition-colors has-[:checked]:border-primary has-[:checked]:bg-surface-2">
              <input type="radio" name="role" value={v} defaultChecked={i === 0} className="size-4 accent-[var(--primary)]" />{l}
            </label>))}
        </fieldset>)}
      {up && <div className="space-y-1"><label className="flex items-start gap-3 text-sm"><input type="checkbox" name="terms" required className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" /><span>I am 18 or older and I agree to the <Link href="/legal/terms" target="_blank" className="font-semibold text-link underline underline-offset-4">Terms of Service</Link> and the <Link href="/legal/privacy" target="_blank" className="font-semibold text-link underline underline-offset-4">Privacy Policy</Link>.</span></label>{fe.terms && <p role="alert" className="text-sm font-medium">Error: {fe.terms}</p>}</div>}
      {sent.error && <p role="alert" className="text-sm font-medium">Error: {sent.error}</p>}
      <div style={stagger(3)}><Button type="submit" size="lg" className="w-full" loading={sending}>Send code{!sending && <ArrowRight className="size-5" aria-hidden />}</Button></div>
    </form>
  );
}
