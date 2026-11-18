import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bath, BedDouble, CalendarDays, Maximize2, Layers, MapPin } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Tag } from "@/components/ui/tag";
import { PhotoGallery } from "@/components/listings/photo-gallery";
import { PinMap } from "@/components/map/pin-map";
import { ReportListing } from "@/components/listings/report-listing";
import { RequestPanel } from "@/components/requests/request-panel";
import { ListingActionBar } from "@/components/listings/listing-action-bar";
import { ListingTopBar } from "@/components/listings/listing-top-bar";
import { ShareButton } from "@/components/listings/share-button";
import { Avatar } from "@/components/ui/avatar";
import { amenityIcon } from "@/lib/amenity-icons";
import { FavouriteButton } from "@/components/listings/favourite-button";
import { formatKes } from "@/lib/utils";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import { Stars } from "@/components/reviews/stars";
import { PUBLIC_REVIEW_COLUMNS, type PublicReview, type Ratings } from "@/lib/reviews";
import { mediaUrl, photoSrcSet, variant } from "@/lib/media-url";

export const revalidate = 300; // ISR. Listing changes also call revalidatePath.
export const dynamicParams = true;
export function generateStaticParams() { return []; }

async function load(slug: string) {
  const supabase = createPublicClient();
  const { data } = await supabase.from("listings")
    .select(`id, slug, title, description, rent, deposit, bedrooms, bathrooms, size_sqm, floor, available_from, units_available,
      published_at, expires_at, owner_id, created_by,
      property:properties(county_id, sub_county, estate, lat, lng, county:counties(name, slug)),
      type:property_types(name),
      media:listing_media(id, kind, path_960, path_video, blur_data_url, position, width, height),
      amenities:listing_amenities(amenity:amenities(slug, name))`)
    .eq("slug", slug).eq("status", "active").gt("expires_at", new Date().toISOString()).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const l = await load((await params).slug);
  if (!l) return {};
  const p = l.property as unknown as { county: { name: string }; estate: string | null };
  const cover = [...(l.media as { kind: string; path_960: string | null; position: number }[])].filter((m) => m.kind === "photo").sort((a, b) => a.position - b.position)[0];
  return {
    title: `${l.title}, ${p.county.name}`,
    description: `${formatKes(l.rent)} per month. ${l.bedrooms} bedroom in ${p.estate ? p.estate + ", " : ""}${p.county.name}.`,
    alternates: { canonical: `/listing/${l.slug}` },
    openGraph: cover?.path_960 ? { images: [mediaUrl(variant(cover.path_960, 1600))] } : undefined,
  };
}

type Media = { id: string; kind: "photo" | "video"; path_960: string | null; path_video: string | null; blur_data_url: string | null; position: number };

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const l = await load((await params).slug);
  if (!l) notFound();

  const sb = createPublicClient();
  const [{ data: landlord }, { data: revs }, { data: lr }] = await Promise.all([
    sb.from("landlord_profiles").select("display_name, member_since, verified, avatar_url").eq("id", l.owner_id).maybeSingle(),
    sb.from("public_reviews").select(PUBLIC_REVIEW_COLUMNS).eq("listing_id", l.id).order("created_at", { ascending: false }).limit(30),
    sb.from("landlord_ratings").select("review_count, avg_overall").eq("landlord_id", l.owner_id).maybeSingle(),
  ]);
  const reviews = (revs ?? []) as PublicReview[];
  const landlordRating = lr as Pick<Ratings, "review_count" | "avg_overall"> | null;
  const p = l.property as unknown as { sub_county: string | null; estate: string | null; lat: number; lng: number; county: { name: string; slug: string } };
  const media = [...(l.media as Media[])].sort((a, b) => a.position - b.position);
  const photos = media.filter((m) => m.kind === "photo");
  const video = media.find((m) => m.kind === "video");
  const amenities = (l.amenities as unknown as { amenity: { slug: string; name: string } }[]).map((a) => a.amenity);
  const caretaker = l.created_by !== l.owner_id;
  const posted = new Date(l.published_at!).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });

  const jsonLd = {
    "@context": "https://schema.org", "@type": "RealEstateListing", name: l.title, description: l.description,
    datePosted: l.published_at, url: `/listing/${l.slug}`,
    offers: { "@type": "Offer", price: l.rent, priceCurrency: "KES", availability: "https://schema.org/InStock" },
    about: { "@type": "Accommodation", numberOfBedrooms: l.bedrooms, numberOfBathroomsTotal: l.bathrooms,
      address: { "@type": "PostalAddress", addressLocality: p.estate ?? p.sub_county ?? p.county.name, addressRegion: p.county.name, addressCountry: "KE" },
      geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng } },
  };

  const facts = [
    { icon: BedDouble, label: l.bedrooms === 0 ? "No bedroom" : `${l.bedrooms} ${l.bedrooms === 1 ? "bedroom" : "bedrooms"}` },
    { icon: Bath, label: `${l.bathrooms} ${l.bathrooms === 1 ? "bathroom" : "bathrooms"}` },
    ...(l.size_sqm ? [{ icon: Maximize2, label: `${l.size_sqm} m²` }] : []),
    ...(l.floor != null ? [{ icon: Layers, label: `Floor ${l.floor}` }] : []),
    { icon: CalendarDays, label: `From ${new Date(l.available_from).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}` },
  ];
  const divider = <hr className="border-border/60" />;

  return (
    <article data-listing-page className="pb-32 lg:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ListingTopBar listingId={l.id} title={l.title} />

      <div className="mx-auto max-w-6xl px-6 md:px-4 md:pt-6">
        <nav aria-label="Breadcrumb" className="mb-4 hidden text-sm text-muted md:block">
          <Link href={`/houses-for-rent/${p.county.slug}`} className="underline-offset-4 hover:underline">{p.county.name}</Link>
        </nav>

        <PhotoGallery title={l.title} photos={photos.map((m) => ({ path: m.path_960!, blur: m.blur_data_url }))}
          actions={<div className="hidden gap-2 md:flex"><FavouriteButton listingId={l.id} iconOnly /><ShareButton title={l.title} /></div>} />

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="space-y-8">
            <header className="space-y-3">
              <h1 id="listing-title" className="text-[32px] leading-tight sm:text-4xl">{l.title}</h1>
              <p className="flex items-center gap-1.5 text-muted"><MapPin className="size-4 shrink-0" aria-hidden />{[p.estate, p.sub_county, p.county.name].filter(Boolean).join(", ")}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <p className="text-3xl font-semibold text-accent">{formatKes(l.rent)}<span className="ml-1 text-base font-normal text-muted">/ month</span></p>
                {l.units_available > 1 && <Tag>{l.units_available} units available</Tag>}
              </div>
              <p className="text-sm text-muted">Posted {posted}{caretaker && " · Managed by a caretaker"} · Deposit {l.deposit ? formatKes(l.deposit) : "not stated"}</p>
            </header>

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {facts.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 rounded-[18px] border border-border bg-surface px-3.5 py-3"><Icon className="size-5 shrink-0 text-accent" aria-hidden /><span className="text-[15px] font-medium">{label}</span></li>))}
            </ul>

            {divider}
            <section aria-labelledby="about"><h2 id="about" className="text-2xl">About this house</h2><p className="mt-3 max-w-prose whitespace-pre-line text-[16px] leading-7 text-foreground/90">{l.description}</p></section>

            {amenities.length > 0 && (<>
              {divider}
              <section aria-labelledby="amen"><h2 id="amen" className="text-2xl">Amenities</h2>
                <ul className="mt-4 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
                  {amenities.map((a) => { const Icon = amenityIcon(a.slug); return (
                    <li key={a.slug} className="flex flex-col items-center gap-2 text-center">
                      <span className="flex size-14 items-center justify-center rounded-[18px] border border-border bg-surface-2 text-accent"><Icon className="size-6" aria-hidden /></span>
                      <span className="text-[13px] leading-tight">{a.name}</span>
                    </li>); })}
                </ul></section></>)}

            {landlord && (<>
              {divider}
              <section aria-labelledby="landlord"><h2 id="landlord" className="text-2xl">{caretaker ? "Listed by a caretaker for" : "Your landlord"}</h2>
                <div className="mt-4 flex items-center gap-4 rounded-[22px] border border-border bg-surface p-4">
                  <Avatar name={landlord.display_name || "Landlord"} path={landlord.avatar_url} className="size-16 text-xl" />
                  <div className="min-w-0 space-y-1.5"><p className="flex flex-wrap items-center gap-2 text-lg font-semibold"><Link href={`/landlord/${l.owner_id}`} className="underline-offset-4 hover:underline">{landlord.display_name || "Landlord"}</Link>{landlord.verified && <VerifiedBadge />}</p>
                    {landlordRating && <p className="flex items-center gap-2 text-sm"><Stars value={Number(landlordRating.avg_overall)} /><b>{Number(landlordRating.avg_overall).toFixed(1)}</b><span className="text-muted">({landlordRating.review_count} {landlordRating.review_count === 1 ? "review" : "reviews"} across their houses)</span></p>}
                    <p className="text-sm text-muted">Member since {new Date(landlord.member_since).toLocaleDateString("en-KE", { month: "long", year: "numeric" })} · <Link href={`/landlord/${l.owner_id}`} className="font-medium text-link underline underline-offset-4">View profile</Link></p></div>
                </div></section></>)}

            {video && (<>
              {divider}
              <section aria-labelledby="tour"><h2 id="tour" className="text-2xl">Walkthrough</h2>
                <video className="mt-3 w-full rounded-[22px] bg-surface" controls preload="none" playsInline src={mediaUrl(video.path_video!)} poster={photos[0]?.path_960 ? mediaUrl(variant(photos[0].path_960, 960)) : undefined} />
              </section></>)}

            {divider}
            <section aria-labelledby="where"><h2 id="where" className="text-2xl">Exact location</h2><div className="mt-3"><PinMap lat={p.lat} lng={p.lng} /></div></section>

            {divider}
            <section aria-labelledby="reviews" className="scroll-mt-28"><h2 id="reviews" className="text-2xl">Reviews</h2>
              <ReviewsSection reviews={reviews} landlordName={landlord?.display_name || "Landlord"} empty="No reviews yet. Tenants can review a landlord after a viewing or a confirmed rental." /></section>

            <ReportListing listingId={l.id} />
            <p className="text-sm text-muted">Never pay before you view the house in person. E.Rent is not a party to any rental agreement.</p>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4 rounded-[26px] border border-border bg-surface p-6 shadow-[0_18px_40px_-20px_rgba(0,0,0,.5)]">
              <p className="text-3xl font-semibold text-accent">{formatKes(l.rent)}<span className="ml-1 text-base font-normal text-muted">/ month</span></p>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Deposit</dt><dd className="font-medium">{l.deposit ? formatKes(l.deposit) : "None stated"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Units available</dt><dd className="font-medium">{l.units_available}</dd></div>
              </dl>
              <RequestPanel listingId={l.id} ownerId={l.owner_id} createdBy={l.created_by} />
            </div>
          </aside>
        </div>
      </div>

      <ListingActionBar listingId={l.id} ownerId={l.owner_id} createdBy={l.created_by} rent={l.rent} />
    </article>
  );
}
