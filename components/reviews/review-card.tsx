import { BadgeCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/tag";
import { Stars } from "./stars";
import { CATEGORIES, REVIEW_PHOTOS, type PublicReview } from "@/lib/reviews";

const date = (d: string) => new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

/** One review. The landlord's public reply carries a badge beside their name. */
export function ReviewCard({ r, landlordName, showListing, children }: { r: PublicReview; landlordName?: string; showListing?: boolean; children?: React.ReactNode }) {
  const cats = CATEGORIES.map(([k, label]) => [label, r[`r_${k}` as keyof PublicReview] as number | null] as const).filter(([, v]) => v);
  return (
    <article className="space-y-3 rounded-[24px] border border-border bg-surface p-5">
      <header className="flex items-center gap-3">
        <Avatar name={r.author_name} path={r.author_avatar} />
        <div className="min-w-0 flex-1"><p className="font-semibold">{r.author_name}</p><p className="text-sm text-muted">{date(r.created_at)}</p></div>
        <Tag>{r.kind === "rental" ? "Rented here" : "Viewed the house"}</Tag>
      </header>
      <div className="flex flex-wrap items-center gap-2"><Stars value={r.overall} size="size-5" />{showListing && <a href={`/listing/${r.listing_slug}`} className="text-sm text-muted underline-offset-4 hover:underline">{r.listing_title}</a>}</div>
      <p className="max-w-prose whitespace-pre-line text-[16px] leading-7">{r.body}</p>
      {cats.length > 0 && <ul className="flex flex-wrap gap-2">{cats.map(([l, v]) => <li key={l} className="rounded-md bg-surface-2 px-2.5 py-1 text-xs"><span className="text-muted">{l}</span> <b>{v}/5</b></li>)}</ul>}
      {r.photos.length > 0 && <ul className="grid grid-cols-3 gap-2">{r.photos.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <li key={p}><a href={REVIEW_PHOTOS(p)} target="_blank" rel="noopener noreferrer"><img src={REVIEW_PHOTOS(p)} alt="Photo from the review" loading="lazy" className="aspect-square w-full rounded-2xl object-cover" /></a></li>))}</ul>}
      {r.reply_body && (
        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">{landlordName ?? "Landlord"}<span className="inline-flex items-center gap-1 rounded-md bg-link/15 px-1.5 py-0.5 text-xs text-link"><BadgeCheck className="size-3.5" aria-hidden />Landlord reply</span></p>
          <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-muted">{r.reply_body}</p>
        </div>)}
      {children}
    </article>
  );
}
