import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bath, BedDouble, CalendarDays, Maximize2, Layers, MapPin } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { PhotoGallery } from "@/components/listings/photo-gallery";
import { PinMap } from "@/components/map/pin-map";
import { ReportListing } from "@/components/listings/report-listing";
import { RequestPanel } from "@/components/requests/request-panel";
import { FavouriteButton } from "@/components/listings/favourite-button";
import { WhatsAppShare } from "@/components/listings/whatsapp-share";
import { formatKes } from "@/lib/utils";
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
      media:listing_media(id, kind, path_960, path_video, blur_data_url, position),
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

  const { data: landlord } = await createPublicClient().from("landlord_profiles").select("display_name, member_since, verified").eq("id", l.owner_id).maybeSingle();
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
    { icon: BedDouble, label: l.bedrooms === 0 ? "No bedroom" : `${l.bedrooms} bedroom${l.bedrooms > 1 ? "s" : ""}` },
    { icon: Bath, label: `${l.bathrooms} bathroom${l.bathrooms === 1 ? "" : "s"}` },
    ...(l.size_sqm ? [{ icon: Maximize2, label: `${l.size_sqm} m²` }] : []),
    ...(l.floor != null ? [{ icon: Layers, label: `Floor ${l.floor}` }] : []),
    { icon: CalendarDays, label: `Available ${new Date(l.available_from).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}` },
  ];

  return (
    <article className="mx-auto max-w-6xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
        <Link href={`/houses-for-rent/${p.county.slug}`} className="underline-offset-4 hover:underline">{p.county.name}</Link>
      </nav>

      <PhotoGallery title={l.title} photos={photos.map((m) => ({ path: m.path_960!, blur: m.blur_data_url }))} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <header className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">{l.title}</h1>
            <p className="flex items-center gap-1 text-muted"><MapPin className="size-4" aria-hidden />{[p.estate, p.sub_county, p.county.name].filter(Boolean).join(", ")}</p>
            <p className="text-sm text-muted">Posted {posted}{caretaker && " · Managed by a caretaker"}</p>
          </header>

          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {facts.map(({ icon: Icon, label }) => <li key={label} className="flex items-center gap-2"><Icon className="size-5" aria-hidden />{label}</li>)}
          </ul>

          <section aria-labelledby="about"><h2 id="about" className="text-xl font-semibold">About this house</h2><p className="mt-3 max-w-prose whitespace-pre-line">{l.description}</p></section>

          {amenities.length > 0 && (
            <section aria-labelledby="amen"><h2 id="amen" className="text-xl font-semibold">Amenities</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">{amenities.map((a) => <li key={a.slug} className="rounded-md border border-border px-3 py-2">{a.name}</li>)}</ul>
            </section>
          )}

          {video && (
            <section aria-labelledby="tour"><h2 id="tour" className="text-xl font-semibold">Walkthrough</h2>
              <video className="mt-3 w-full rounded-lg bg-surface" controls preload="none" playsInline src={mediaUrl(video.path_video!)} poster={photos[0]?.path_960 ? mediaUrl(variant(photos[0].path_960, 960)) : undefined} />
            </section>
          )}

          <section aria-labelledby="where"><h2 id="where" className="text-xl font-semibold">Exact location</h2>
            <div className="mt-3"><PinMap lat={p.lat} lng={p.lng} /></div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-4 rounded-[20px] border border-border bg-surface p-5">
            <p className="text-3xl font-semibold text-accent">{formatKes(l.rent)}<span className="text-base font-normal text-muted"> / month</span></p>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Deposit</dt><dd className="font-medium">{l.deposit ? formatKes(l.deposit) : "None stated"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Units available</dt><dd className="font-medium">{l.units_available}</dd></div>
            </dl>
            {landlord && (
              <div className="space-y-1 border-t border-border pt-4">
                <p className="text-sm text-muted">{caretaker ? "Listed by a caretaker for" : "Landlord"}</p>
                <p className="flex flex-wrap items-center gap-2 font-medium">{landlord.display_name || "Landlord"}{landlord.verified && <VerifiedBadge />}</p>
                <p className="text-sm text-muted">Member since {new Date(landlord.member_since).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}</p>
              </div>
            )}
            <RequestPanel listingId={l.id} ownerId={l.owner_id} createdBy={l.created_by} />
            <FavouriteButton listingId={l.id} />
            <ReportListing listingId={l.id} />
            <p className="border-t border-border pt-4 text-sm text-muted">Never pay before you view the house in person. E.Rent is not a party to any rental agreement.</p>
          </div>
        </aside>
      </div>
      <WhatsAppShare title={l.title} />
    </article>
  );
}
