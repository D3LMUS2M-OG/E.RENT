import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { formatKes } from "@/lib/utils";

export type Insight = { scope: "estate" | "sub_county" | "county"; area: string; n: number; p25: number; median: number; p75: number; rent: number };
const WHERE = { estate: "in", sub_county: "in", county: "in" } as const;

/** Where this rent sits among similar houses: the typical range, the middle, and a marker. Words and icons carry the meaning, not colour. */
export function PriceInsight({ insight: i, houseType }: { insight: Insight; houseType?: string }) {
  const lo = Math.min(i.p25, i.rent) * 0.9, hi = Math.max(i.p75, i.rent) * 1.1; const span = Math.max(1, hi - lo);
  const pos = (v: number) => `${Math.min(100, Math.max(0, ((v - lo) / span) * 100))}%`;
  const diff = Math.round(((i.rent - i.median) / i.median) * 100);
  const verdict = i.rent < i.p25 ? { Icon: ArrowDown, text: "Lower than most similar houses" } : i.rent > i.p75 ? { Icon: ArrowUp, text: "Higher than most similar houses" } : { Icon: Minus, text: "In the typical range" };
  return (
    <section aria-labelledby="price" className="space-y-4">
      <h2 id="price" className="text-2xl">How the rent compares</h2>
      <div className="space-y-4 rounded-[24px] border border-border bg-surface p-5">
        <p className="flex items-center gap-2 text-lg font-semibold"><verdict.Icon className="size-5 text-accent" aria-hidden />{verdict.text}
          {diff !== 0 && <span className="text-sm font-normal text-muted">({Math.abs(diff)}% {diff < 0 ? "below" : "above"} the middle)</span>}</p>
        <div className="relative h-14" role="img" aria-label={`This house costs ${formatKes(i.rent)}. The typical range is ${formatKes(i.p25)} to ${formatKes(i.p75)}, with a middle of ${formatKes(i.median)}.`}>
          <span className="absolute inset-x-0 top-7 h-1.5 rounded-full bg-surface-2" />
          <span className="absolute top-6 h-3.5 rounded-full bg-foreground/25" style={{ left: pos(i.p25), width: `calc(${pos(i.p75)} - ${pos(i.p25)})` }} />
          <span className="absolute top-5 h-5 w-0.5 bg-foreground/60" style={{ left: pos(i.median) }} />
          <span className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: pos(i.rent) }}><span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">This house</span><span className="h-3 w-0.5 bg-primary" /><span className="size-3 rounded-full bg-primary" /></span>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-sm"><div><dt className="text-muted">Typical low</dt><dd className="font-semibold">{formatKes(i.p25)}</dd></div><div><dt className="text-muted">Middle</dt><dd className="font-semibold">{formatKes(i.median)}</dd></div><div><dt className="text-muted">Typical high</dt><dd className="font-semibold">{formatKes(i.p75)}</dd></div></dl>
        <p className="text-sm text-muted">Based on {i.n} live {houseType ? `${houseType.toLowerCase()} ` : ""}listings {WHERE[i.scope]} {i.area}. A guide, not a valuation: size, condition and amenities change what a fair rent is.</p>
      </div>
    </section>
  );
}
