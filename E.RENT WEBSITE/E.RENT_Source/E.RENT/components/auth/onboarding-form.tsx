"use client";

import { useActionState } from "react";
import { ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeOnboarding, type AuthState } from "@/app/(auth)/actions";
import { stagger } from "@/lib/utils";

export function OnboardingForm({ next, needsName }: { next: string; needsName: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(completeOnboarding, {});
  return (
    <form action={action} className="stagger space-y-5">
      <input type="hidden" name="next" value={next} />
      {needsName && (
        <div style={stagger(0)} className="space-y-1.5">
          <label htmlFor="full_name" className="text-sm font-medium">Your name</label>
          <div className="relative"><User className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <input id="full_name" name="full_name" autoComplete="name" required className="min-h-12 w-full rounded-[14px] border border-border-strong bg-background/60 pl-11 pr-3.5 text-base" /></div>
        </div>)}
      <fieldset style={stagger(1)} className="space-y-2">
        <legend className="sr-only">I am joining as</legend>
        {[["tenant", "A tenant", "Search houses, chat with landlords, save favourites"], ["landlord", "A landlord or caretaker", "List houses, get verified, answer tenants"]].map(([v, l, d], i) => (
          <label key={v} className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-border bg-background/50 p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-surface-2">
            <input type="radio" name="role" value={v} defaultChecked={i === 0} className="mt-1 size-4 accent-[var(--primary)]" />
            <span><b className="block">{l}</b><span className="text-sm text-muted">{d}</span></span>
          </label>))}
      </fieldset>
      {state.error && <p role="alert" className="text-sm font-medium">Error: {state.error}</p>}
      <div style={stagger(2)}><Button type="submit" size="lg" className="w-full" loading={pending}>Continue{!pending && <ArrowRight className="size-5" aria-hidden />}</Button></div>
    </form>
  );
}
