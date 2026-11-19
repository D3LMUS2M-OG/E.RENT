"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { KINDS, type Place } from "./neighbourhood";

const field = "min-h-11 w-full rounded-[14px] border border-border-strong bg-background/60 px-3.5 text-base";

/** Landlords list what is nearby: schools, clinics, matatu stages, shops. Up to 15 places. */
export function NearbyEditor({ propertyId, places: initial }: { propertyId: string; places: Place[] }) {
  const supabase = createClient(); const router = useRouter();
  const [places, setPlaces] = useState(initial); const [kind, setKind] = useState<Place["kind"]>("school"); const [name, setName] = useState(""); const [min, setMin] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function add() {
    setErr(""); if (name.trim().length < 2) { setErr("Enter the name of the place"); return; }
    setBusy(true);
    const { data, error } = await supabase.from("neighbourhood_places").insert({ property_id: propertyId, kind, name: name.trim(), walk_minutes: min ? Math.min(120, Math.max(1, Number(min))) : null }).select("id, kind, name, walk_minutes").single();
    setBusy(false);
    if (error || !data) { setErr(error?.message.includes("15") ? "You can add up to 15 places." : "Could not add it. Try again."); return; }
    setPlaces([...places, data as Place]); setName(""); setMin(""); router.refresh();
  }
  async function remove(id: string) { const { error } = await supabase.from("neighbourhood_places").delete().eq("id", id); if (!error) { setPlaces(places.filter((p) => p.id !== id)); router.refresh(); } }
  return (
    <section aria-labelledby="nearby" className="space-y-4">
      <div><h2 id="nearby" className="text-2xl font-semibold">What is nearby</h2><p className="text-sm text-muted">Tenants look for schools, clinics, matatu stages and shops. Add the ones close to this house.</p></div>
      {places.length > 0 && <ul className="space-y-1.5">{places.map((p) => <li key={p.id} className="flex items-center gap-3 rounded-[16px] border border-border bg-surface py-1.5 pl-4 pr-1.5"><span className="min-w-0 flex-1 text-[15px]"><b>{p.name}</b> <span className="text-muted">· {KINDS[p.kind].label}{p.walk_minutes ? ` · ${p.walk_minutes} min walk` : ""}</span></span><Button variant="ghost" size="icon" aria-label={`Remove ${p.name}`} onClick={() => remove(p.id)}><Trash2 className="size-5" aria-hidden /></Button></li>)}</ul>}
      <div className="grid gap-3 sm:grid-cols-[11rem_1fr_7rem_auto] sm:items-end">
        <div className="space-y-1"><label htmlFor="pk" className="text-sm font-medium">Kind</label><select id="pk" className={field} value={kind} onChange={(e) => setKind(e.target.value as Place["kind"])}>{(Object.keys(KINDS) as Place["kind"][]).map((k) => <option key={k} value={k}>{KINDS[k].label}</option>)}</select></div>
        <div className="space-y-1"><label htmlFor="pn" className="text-sm font-medium">Name</label><input id="pn" className={field} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="For example Kakamega Primary" /></div>
        <div className="space-y-1"><label htmlFor="pm" className="text-sm font-medium">Minutes on foot</label><input id="pm" inputMode="numeric" className={field} value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, "").slice(0, 3))} /></div>
        <Button type="button" onClick={add} loading={busy}>Add</Button>
      </div>
      {err && <p role="alert" className="text-sm font-medium">Error: {err}</p>}
    </section>
  );
}
