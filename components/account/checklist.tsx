"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHECKLIST, ALL_KEYS } from "@/lib/checklist";
import { saveChecklist } from "@/app/account/checklist/actions";
import { cn } from "@/lib/utils";

/** Tick as you go. Saves a moment after every change. */
export function Checklist({ requestId, initialDone, initialNotes }: { requestId: string | null; initialDone: string[]; initialNotes: string }) {
  const [done, setDone] = useState(new Set(initialDone)); const [notes, setNotes] = useState(initialNotes);
  const [status, setStatus] = useState(""); const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setStatus("Saving…");
    const t = setTimeout(async () => { const r = await saveChecklist(requestId, [...done], notes); setStatus(r.error ?? "Saved"); }, 700);
    return () => clearTimeout(t);
  }, [done, notes, requestId]);
  const total = ALL_KEYS.length; const n = done.size;
  return (
    <div className="space-y-8">
      <div className="no-print sticky top-24 z-10 rounded-[20px] border border-border bg-surface/95 p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3 text-sm"><b>{n} of {total} done</b><span role="status" className="text-muted">{status}</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={n} aria-valuemin={0} aria-valuemax={total} aria-label="Checklist progress"><div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-[cubic-bezier(.34,1.3,.64,1)]" style={{ width: `${(n / total) * 100}%` }} /></div>
      </div>
      {CHECKLIST.map((g) => (
        <fieldset key={g.id} className="space-y-2"><legend className="mb-1 font-serif text-2xl">{g.title}</legend>
          {g.items.map((i) => { const on = done.has(i.key); return (
            <label key={i.key} className={cn("flex min-h-14 cursor-pointer items-start gap-3 rounded-[18px] border px-4 py-3 transition-colors", on ? "border-primary/60 bg-primary/10" : "border-border bg-surface")}>
              <input type="checkbox" checked={on} onChange={() => setDone((d) => { const x = new Set(d); if (x.has(i.key)) x.delete(i.key); else x.add(i.key); return x; })} className="peer sr-only" />
              <span aria-hidden className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2", on ? "border-primary bg-primary text-primary-foreground" : "border-border-strong")}>{on && <Check className="size-4" />}</span>
              <span><span className={cn("block text-[16px]", on && "text-muted line-through")}>{i.text}</span>{i.tip && <span className="block text-sm text-muted">{i.tip}</span>}</span>
            </label>); })}
        </fieldset>))}
      <div className="space-y-1.5"><label htmlFor="notes" className="font-serif text-2xl">Notes</label>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} maxLength={4000} placeholder="Meter number, deposit paid, what you agreed with the landlord…" className="w-full rounded-[18px] border border-border-strong bg-background/60 p-4 text-base" /></div>
      <Button variant="secondary" className="no-print" onClick={() => window.print()}><Printer className="size-4" aria-hidden />Print or save as PDF</Button>
    </div>
  );
}
