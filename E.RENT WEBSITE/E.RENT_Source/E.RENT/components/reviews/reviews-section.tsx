import { ReviewCard } from "./review-card";
import { Stars } from "./stars";
import { CATEGORIES, type PublicReview, type Ratings } from "@/lib/reviews";

/** Summary (average, count, category averages) followed by the reviews. Used on listing pages and landlord profiles. */
export function ReviewsSection({ reviews, ratings, landlordName, showListing, empty }: { reviews: PublicReview[]; ratings?: Ratings | null; landlordName?: string; showListing?: boolean; empty: string }) {
  if (reviews.length === 0) return <p className="mt-2 max-w-prose text-muted">{empty}</p>;
  const n = ratings?.review_count ?? reviews.filter((r) => r.is_latest).length;
  const latest = reviews.filter((r) => r.is_latest);
  const avg = ratings?.avg_overall ?? latest.reduce((s, r) => s + r.overall, 0) / Math.max(1, latest.length);
  const avgOf = (k: string) => { const v = latest.map((r) => r[`r_${k}` as keyof PublicReview] as number | null).filter((x): x is number => typeof x === "number"); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const cats = CATEGORIES.map(([k, label]) => [label, (ratings?.[`avg_${k}` as keyof Ratings] as number | null | undefined) ?? avgOf(k)] as const).filter(([, v]) => v);
  return (
    <div className="mt-4 space-y-5">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[24px] border border-border bg-surface p-5">
        <div><p className="text-5xl font-semibold tracking-tight">{Number(avg).toFixed(1)}</p><Stars value={Number(avg)} size="size-5" className="mt-1" /><p className="mt-1 text-sm text-muted">{n} {n === 1 ? "review" : "reviews"}</p></div>
        {cats.length > 0 && <ul className="grid min-w-52 flex-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">{cats.map(([l, v]) => <li key={l} className="flex items-center justify-between gap-3"><span className="text-muted">{l}</span><b>{Number(v).toFixed(1)}</b></li>)}</ul>}
      </div>
      <ul className="space-y-4">{reviews.map((r) => <li key={r.id}><ReviewCard r={r} landlordName={landlordName} showListing={showListing} /></li>)}</ul>
    </div>
  );
}
