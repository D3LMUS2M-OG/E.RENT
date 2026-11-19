"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Availability } from "@/lib/availability";

const DAYS = [[1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"], [7, "Sun"]] as const;
const field = "min-h-11 w-full rounded-[14px] border border-border-strong bg-background/60 px-3.5 text-base";

/** The hours tenants can expect you to answer. Shown on your profile and listings. */
export function AvailabilityForm({ initial }: { initial: Availability }) {
  const supabase = createClient();
  const [a, setA] = useState({ ...initial, start_time: initial.start_time.slice(0, 5), end_time: initial.end_time.slice(0, 5) });
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  async function save() {
    setMsg(""); if (a.days.length === 0) { setMsg("Pick at least one day"); return; } if (a.end_time <= a.start_time) { setMsg("The end time must be after the start time"); return; }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = user ? await supabase.from("landlord_availability").upsert({ user_id: user.id, days: a.days, start_time: a.start_time, end_time: a.end_time, note: a.note.slice(0, 200), updated_at: new Date().toISOString() }) : { error: new Error("x") };
    setBusy(false); setMsg(error ? "Could not save. Try again." : "Saved.");
  }
  return (
    <div className="space-y-5 rounded-[24px] border border-border bg-surface p-5">
      <fieldset className="space-y-2"><legend className="text-sm font-medium">Days you answer tenants</legend>
        <ul className="flex flex-wrap gap-2">{DAYS.map(([n, l]) => { const on = a.days.includes(n); return <li key={n}><button type="button" aria-pressed={on} onClick={() => setA({ ...a, days: on ? a.days.filter((d) => d !== n) : [...a.days, n] })} className={cn("min-h-11 min-w-14 rounded-full border px-3 text-sm font-semibold transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "border-border-strong hover:bg-surface-2")}>{l}</button></li>; })}</ul></fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><label htmlFor="from" className="text-sm font-medium">From</label><input id="from" type="time" className={field} value={a.start_time} onChange={(e) => setA({ ...a, start_time: e.target.value })} /></div>
        <div className="space-y-1.5"><label htmlFor="to" className="text-sm font-medium">Until</label><input id="to" type="time" className={field} value={a.end_time} onChange={(e) => setA({ ...a, end_time: e.target.value })} /></div>
      </div>
      <div className="space-y-1.5"><label htmlFor="note" className="text-sm font-medium">A short note (optional)</label><input id="note" className={field} maxLength={200} value={a.note} onChange={(e) => setA({ ...a, note: e.target.value })} placeholder="For example: viewings on Saturday mornings" /></div>
      <div className="flex items-center gap-3"><Button onClick={save} loading={busy}>Save hours</Button><span role="status" className="text-sm text-muted">{msg}</span></div>
    </div>
  );
}
