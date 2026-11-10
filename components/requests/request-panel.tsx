"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { createRequest } from "@/app/requests/actions";
import { startChat } from "@/app/chats/actions";
import { ActionButton } from "@/components/ui/action-button";
import type { ActionState } from "@/app/dashboard/actions";

type Mine = { id: string; kind: "view" | "apply"; status: string };
const KIND = { view: "Viewing request", apply: "Application" } as const;
const STATUS: Record<string, string> = { pending: "Waiting for a reply", accepted: "Accepted", declined: "Declined", cancelled: "Cancelled" };

export function RequestPanel({ listingId, ownerId, createdBy }: { listingId: string; ownerId: string; createdBy: string }) {
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  const [mine, setMine] = useState<Mine[]>([]);
  const [state, action, pending] = useActionState(createRequest.bind(null, listingId), {} as ActionState);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setUid(data.user?.id ?? null);
      if (!data.user) return;
      const { data: rows } = await supabase.from("rental_requests").select("id, kind, status").eq("listing_id", listingId).order("created_at", { ascending: false });
      setMine((rows ?? []) as Mine[]);
    });
  }, [listingId, state.ok]);

  if (uid === undefined) return <div className="skeleton h-40 rounded-md" aria-hidden />;
  if (uid === ownerId || uid === createdBy) return <p className="text-sm text-muted">This is your listing. Requests arrive under Dashboard, Requests.</p>;
  if (uid === null) {
    const next = typeof window !== "undefined" ? window.location.pathname : "/";
    return <Button asChild size="lg" className="w-full"><Link href={`/sign-in?next=${encodeURIComponent(next)}`}>Sign in to request a viewing</Link></Button>;
  }
  const open = new Set(mine.filter((m) => m.status === "pending" || m.status === "accepted").map((m) => m.kind));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <ActionButton action={startChat.bind(null, listingId)} variant="secondary" size="lg" className="w-full">Message the landlord</ActionButton>
      {mine.length > 0 && (
        <ul className="space-y-1 text-sm">
          {mine.slice(0, 3).map((m) => <li key={m.id}><span className="font-medium">{KIND[m.kind]}:</span> {STATUS[m.status]}</li>)}
          <li><Link className="underline underline-offset-4" href="/account/requests">See all your requests</Link></li>
        </ul>
      )}
      {open.size < 2 && (
        <form action={action} className="space-y-4" noValidate>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">What would you like to do?</legend>
            {(["view", "apply"] as const).map((k, i) => (
              <label key={k} className={`flex min-h-11 items-center gap-3 rounded-md border border-border px-3 ${open.has(k) ? "opacity-40" : ""}`}>
                <input type="radio" name="kind" value={k} defaultChecked={!open.has("view") ? k === "view" : k === "apply"} disabled={open.has(k)} className="size-4 accent-[var(--primary)]" />
                {k === "view" ? "Request to view" : "Apply to rent"}
              </label>))}
          </fieldset>
          <Field label="Preferred viewing date (optional)" htmlFor="preferred_date"><Input id="preferred_date" name="preferred_date" type="date" min={today} /></Field>
          <Field label="Number of people who will live here" htmlFor="occupants"><Input id="occupants" name="occupants" inputMode="numeric" defaultValue={1} /></Field>
          <Field label="Message (optional)" htmlFor="message">
            <textarea id="message" name="message" rows={3} maxLength={1000} placeholder="Introduce yourself and ask what you need to know" className="w-full rounded-md border border-border-strong bg-background p-3 text-base" />
          </Field>
          {state.error && <p role="alert" className="text-sm font-medium">Error: {state.error}</p>}
          {state.message && <p role="status" className="text-sm font-medium">{state.message}</p>}
          <Button type="submit" size="lg" className="w-full" loading={pending}>Send request</Button>
          <p className="text-sm text-muted">Do not put your phone number in the message.</p>
        </form>
      )}
    </div>
  );
}
