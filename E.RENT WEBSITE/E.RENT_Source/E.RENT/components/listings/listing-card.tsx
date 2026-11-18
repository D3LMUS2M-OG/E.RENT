import Link from "next/link";
import { Home, MapPin } from "lucide-react";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Rating } from "@/components/ui/rating";
import { formatKes } from "@/lib/utils";
import { mediaUrl, photoSrcSet, variant } from "@/lib/media-url";

export type ListingCardData = {
  slug: string; title: string; rent: number; area: string; county: string; bedrooms: number;
  photos?: string[]; coverPath?: string | null; verified?: boolean; rating?: number; reviewCount?: number; managedByCaretaker?: boolean;
  unitsAvailable?: number; distanceKm?: number | null;
};

function Photo({ path, title, sizes, className }: { path: string; title: string; sizes: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={mediaUrl(variant(path, 480))} srcSet={photoSrcSet(path)} sizes={sizes} alt={title} loading="lazy" decoding="async" className={`size-full rounded-[14px] object-cover ${className ?? ""}`} />;
}

/** A card is a photo collage with rounded corners above a text box. Photos stay clean: no tint, no overlays. */
export function ListingCard({ listing }: { listing: ListingCardData }) {
  const photos = listing.photos?.length ? listing.photos : listing.coverPath ? [listing.coverPath] : [];
  const sizes = "(min-width:1024px) 22vw, (min-width:640px) 45vw, 90vw";
  return (
    <article className="group overflow-hidden rounded-[22px] border border-border bg-surface p-2 transition-transform duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5">
      <Link href={`/listing/${listing.slug}`} className="block">
        <div className="aspect-[4/3] overflow-hidden rounded-[16px] bg-surface-2">
          {photos.length >= 3 ? (
            <div className="grid size-full grid-cols-[1.35fr_1fr] grid-rows-2 gap-1.5">
              <div className="row-span-2"><Photo path={photos[0]} title={listing.title} sizes={sizes} /></div>
              <Photo path={photos[1]} title="" sizes={sizes} /><Photo path={photos[2]} title="" sizes={sizes} />
            </div>
          ) : photos.length === 2 ? (
            <div className="grid size-full grid-cols-2 gap-1.5"><Photo path={photos[0]} title={listing.title} sizes={sizes} /><Photo path={photos[1]} title="" sizes={sizes} /></div>
          ) : photos.length === 1 ? (
            <Photo path={photos[0]} title={listing.title} sizes={sizes} />
          ) : (
            <div className="grid h-full place-items-center text-muted"><Home className="size-8" aria-hidden /><span className="sr-only">No photo</span></div>
          )}
        </div>
        <div className="space-y-2 px-2 pb-2 pt-3.5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[26px] font-semibold leading-none tracking-tight text-accent">{formatKes(listing.rent)}<span className="ml-1 text-sm font-normal text-muted">/ month</span></p>
            {listing.rating !== undefined && <Rating value={listing.rating} count={listing.reviewCount} />}
          </div>
          <h3 className="line-clamp-1 text-base font-semibold">{listing.title}</h3>
          <p className="flex items-center gap-1 text-sm text-muted"><MapPin className="size-4 shrink-0" aria-hidden />{listing.area ? `${listing.area}, ` : ""}{listing.county}{listing.distanceKm != null && <span> · {listing.distanceKm.toFixed(1)} km away</span>}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5 text-sm">
            <span>{listing.bedrooms === 0 ? "No bedroom" : `${listing.bedrooms} bed`}</span>
            {listing.unitsAvailable !== undefined && listing.unitsAvailable > 1 && <span className="text-muted">{listing.unitsAvailable} units available</span>}
            {listing.verified && <VerifiedBadge />}
            {listing.managedByCaretaker && <span className="text-muted">Managed by caretaker</span>}
          </div>
        </div>
      </Link>
    </article>
  );
}

export const toCard = (r: import("@/lib/types").SearchRow): ListingCardData => ({
  slug: r.slug, title: r.title, rent: r.rent, area: r.estate ?? r.ward ?? r.sub_county ?? "", county: r.county, bedrooms: r.bedrooms, verified: r.landlord_verified,
  photos: r.photos, coverPath: r.cover_path, managedByCaretaker: r.managed_by_caretaker, unitsAvailable: r.units_available,
  distanceKm: r.distance_m == null ? null : r.distance_m / 1000,
});
