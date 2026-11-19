import { Droplets, Plug, Route, ShieldCheck } from "lucide-react";
import { Stars } from "@/components/reviews/stars";

export type Reliability = { scope: "estate" | "sub_county" | "county"; area: string; n: number; water: number | null; power: number | null; road: number | null; security: number | null };

/** What tenants who lived or viewed around here say about the things that matter most day to day. */
export function AreaReliability({ r }: { r: Reliability }) {
  const rows = [[Droplets, "Water supply", r.water], [Plug, "Power supply", r.power], [Route, "Road access", r.road], [ShieldCheck, "Security", r.security]] as const;
  return (
    <section aria-labelledby="reliab" className="space-y-4">
      <h2 id="reliab" className="text-2xl">How reliable is the area?</h2>
      <div className="rounded-[24px] border border-border bg-surface p-5">
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">{rows.map(([I, label, v]) => (
          <li key={label} className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2.5"><I className="size-5 text-accent" aria-hidden />{label}</span>
            {v !== null ? <span className="inline-flex items-center gap-2"><Stars value={Number(v)} /><b className="tabular-nums">{Number(v).toFixed(1)}</b></span> : <span className="text-sm text-muted">Not rated yet</span>}</li>))}</ul>
        <p className="mt-4 text-sm text-muted">From {r.n} tenant {r.n === 1 ? "review" : "reviews"} in {r.area}. Each tenant counts once, using their newest review.</p>
      </div>
    </section>
  );
}
