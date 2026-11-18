"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { COUNTIES } from "@/lib/counties";
import { HOUSE_TYPES } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export type FeedPrefs = { counties: string[]; types: string[]; max_rent: number | null; min_bedrooms: number | null };

/** What you want on your own feed: up to 5 counties, house types, a budget and a minimum number of bedrooms. */
export function FeedForm({ initial }: { initial: FeedPrefs }) {
  const router = useRouter(); const supabase = createClient();
  const [p, setP] = useState(initial); const [msg, setMsg] = useState(""); const [saving, setSaving] = useState(false);
  const name = (slug: string) => COUNTIES.find((c) => c.slug === slug)?.name ?? slug;
  async function save() {
    setSaving(true); setMsg("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("feed_preferences").upsert({ user_id: user.id, counties: p.counties, types: p.types, max_rent: p.max_rent, min_bedrooms: p.min_bedrooms, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) setMsg("We could not save that. Try again."); else { setMsg("Saved."); router.refresh(); }
  }
  const field = "min-h-11 w-full rounded-[14px] border border-border-strong bg-background/60 px-3.5";
  return (
    <div className="space-y-6 rounded-[24px] border border-border bg-surface p-5">
      <div className="space-y-2">
        <label htmlFor="county" className="text-sm font-medium">Counties (up to 5)</label>
        <select id="county" className={field} value="" disabled={p.counties.length >= 5} onChange={(e) => e.target.value && !p.counties.includes(e.target.value) && setP({ ...p, counties: [...p.counties, e.target.value] })}>
          <option value="">{p.counties.length >= 5 ? "You picked 5" : "Add a county"}</option>
          {COUNTIES.filter((c) => !p.counties.includes(c.slug)).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        {p.counties.length > 0 && <ul className="flex flex-wrap gap-2">{p.counties.map((s) => <li key={s} className="inline-flex items-center gap-1 rounded-full border border-border-strong py-0.5 pl-3 pr-1 text-sm">{name(s)}<button type="button" aria-label={`Remove ${name(s)}`} onClick={() => setP({ ...p, counties: p.counties.filter((x) => x !== s) })} className="inline-flex size-8 items-center justify-center rounded-full hover:bg-foreground/10"><X className="size-4" aria-hidden /></button></li>)}</ul>}
      </div>
      <fieldset className="space-y-2"><legend className="text-sm font-medium">House types</legend>
        <ul className="flex flex-wrap gap-2">{HOUSE_TYPES.map(([slug, label]) => { const on = p.types.includes(slug); return (
          <li key={slug}><button type="button" aria-pressed={on} onClick={() => setP({ ...p, types: on ? p.types.filter((x) => x !== slug) : [...p.types, slug].slice(0, 10) })} className={cn("min-h-10 rounded-full border px-3.5 text-sm font-medium transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "border-border-strong hover:bg-surface-2")}>{label}</button></li>); })}</ul></fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><label htmlFor="rent" className="text-sm font-medium">Most you can pay per month (KES)</label><input id="rent" inputMode="numeric" className={field} placeholder="No limit" value={p.max_rent ?? ""} onChange={(e) => setP({ ...p, max_rent: e.target.value.replace(/\D/g, "") ? Number(e.target.value.replace(/\D/g, "")) : null })} /></div>
        <div className="space-y-1.5"><label htmlFor="beds" className="text-sm font-medium">Bedrooms (at least)</label><select id="beds" className={field} value={p.min_bedrooms ?? ""} onChange={(e) => setP({ ...p, min_bedrooms: e.target.value === "" ? null : Number(e.target.value) })}><option value="">Any</option>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}{n === 4 ? "+" : ""}</option>)}</select></div>
      </div>
      <div className="flex items-center gap-3"><Button onClick={save} loading={saving}>Save my feed</Button><span role="status" className="text-sm text-muted">{msg}</span></div>
    </div>
  );
}
