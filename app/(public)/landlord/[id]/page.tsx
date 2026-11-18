import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { Avatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { Stars } from "@/components/reviews/stars";
import { PUBLIC_REVIEW_COLUMNS, type PublicReview, type Ratings } from "@/lib/reviews";
import { formatKes } from "@/lib/utils";

export const revalidate = 300;
type Params = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const sb = createPublicClient();
  const { data: l } = await sb.from("landlord_profiles").select("id, display_name, member_since, verified, avatar_url").eq("id", id).maybeSingle();
  if (!l) return null;
  const [{ data: ratings }, { data: reviews }, { data: listings }] = await Promise.all([
    sb.from("landlord_ratings").select("*").eq("landlord_id", id).maybeSingle(),
    sb.from("public_reviews").select(PUBLIC_REVIEW_COLUMNS).eq("landlord_id", id).order("created_at", { ascending: false }).limit(50),
    sb.from("listings").select("slug, title, rent, bedrooms").eq("owner_id", id).eq("status", "active").gt("expires_at", new Date().toISOString()).order("published_at", { ascending: false }).limit(24),
  ]);
  return { l, ratings: ratings as Ratings | null, reviews: (reviews ?? []) as PublicReview[], listings: listings ?? [] };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const d = await load((await params).id);
  return d ? { title: `${d.l.display_name || "Landlord"} on E.Rent`, description: `Houses and reviews from ${d.l.display_name || "this landlord"}.` } : { title: "Landlord" };
}

export default async function LandlordPage({ params }: Params) {
  const d = await load((await params).id); if (!d) notFound();
  const { l, ratings, reviews, listings } = d; const name = l.display_name || "Landlord";
  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 pb-8 pt-6">
      <header className="flex flex-wrap items-center gap-5 rounded-[28px] border border-border bg-surface p-6">
        <Avatar name={name} path={l.avatar_url} className="size-24 text-3xl" />
        <div className="space-y-2">
          <h1 className="flex flex-wrap items-center gap-3 text-3xl">{name}{l.verified && <VerifiedBadge />}</h1>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted"><span className="inline-flex items-center gap-1.5"><Calendar className="size-4" aria-hidden />Member since {new Date(l.member_since).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}</span><span>{listings.length} {listings.length === 1 ? "house" : "houses"} listed now</span></p>
          {ratings ? <p className="flex items-center gap-2"><Stars value={Number(ratings.avg_overall)} size="size-5" /><b>{Number(ratings.avg_overall).toFixed(1)}</b><span className="text-sm text-muted">({ratings.review_count} {ratings.review_count === 1 ? "review" : "reviews"})</span></p> : <p className="text-sm text-muted">No reviews yet</p>}
        </div>
      </header>
      <section aria-labelledby="houses"><h2 id="houses" className="text-2xl">Houses by {name}</h2>
        {listings.length === 0 ? <p className="mt-2 text-muted">No houses are listed right now.</p> : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">{listings.map((x) => (
            <li key={x.slug}><Link href={`/listing/${x.slug}`} className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-surface p-4 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-foreground/40"><span className="min-w-0"><b className="block truncate">{x.title}</b></span><span className="shrink-0 font-semibold text-accent">{formatKes(x.rent)}</span></Link></li>))}</ul>)}
      </section>
      <section aria-labelledby="reviews"><h2 id="reviews" className="text-2xl">Reviews</h2>
        <ReviewsSection reviews={reviews} ratings={ratings} landlordName={name} showListing empty="No reviews yet. Tenants can review a landlord after a viewing or a confirmed rental." /></section>
    </div>
  );
}
