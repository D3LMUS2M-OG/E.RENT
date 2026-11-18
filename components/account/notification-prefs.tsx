"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Prefs = { email: boolean; in_app: boolean; whatsapp: boolean };
const ROWS: [keyof Prefs, string, string][] = [
  ["in_app", "In the app", "The bell in the top bar. Always the fastest."],
  ["email", "Email", "A short email for new requests, decisions, reviews and chat messages you have not read."],
  ["whatsapp", "WhatsApp", "A WhatsApp message to your saved phone number. Off until you turn it on."],
];

/** One switch per channel. Saves as you tap. */
export function NotificationPrefs() {
  const supabase = createClient();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
      const [{ data: p }, { data: pr }] = await Promise.all([supabase.from("notification_preferences").select("email, in_app, whatsapp").eq("user_id", user.id).maybeSingle(), supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle()]);
      setPrefs(p ?? { email: true, in_app: true, whatsapp: false }); setPhone(pr?.phone ?? null);
    })();
  }, [supabase]);

  async function set(k: keyof Prefs, v: boolean) {
    if (!prefs) return; const next = { ...prefs, [k]: v }; setPrefs(next); setNote("");
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { error } = await supabase.from("notification_preferences").upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() });
    if (error) { setPrefs(prefs); setNote("We could not save that. Try again."); } else setNote("Saved.");
  }

  if (!prefs) return <p className="text-sm text-muted">Loading…</p>;
  return (
    <div className="space-y-2">
      {ROWS.map(([k, label, desc]) => (
        <label key={k} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-[16px] border border-border bg-background/50 px-4 py-2.5">
          <span className="min-w-0 flex-1"><b className="block text-[15px]">{label}</b><span className="block text-sm text-muted">{desc}</span>
            {k === "whatsapp" && prefs.whatsapp && !phone && <span className="mt-1 block text-sm font-medium">Add your phone number under Details so we know where to send it. <Link href="#phone" className="text-link underline underline-offset-4">Go to Details</Link></span>}</span>
          <input type="checkbox" role="switch" checked={prefs[k]} onChange={(e) => set(k, e.target.checked)} className="peer sr-only" />
          <span aria-hidden className={cn("relative h-7 w-12 shrink-0 rounded-full border border-border-strong transition-colors", prefs[k] ? "bg-primary" : "bg-surface-2")}>
            <span className={cn("absolute top-0.5 size-5 rounded-full bg-foreground transition-[left] duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]", prefs[k] ? "left-[1.6rem] bg-primary-foreground" : "left-0.5")} /></span>
        </label>))}
      <p role="status" className="min-h-5 text-sm text-muted">{note}</p>
    </div>
  );
}
