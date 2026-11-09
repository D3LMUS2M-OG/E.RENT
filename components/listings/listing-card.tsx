import Link from "next/link";
import { Home, MapPin } from "lucide-react";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Rating } from "@/components/ui/rating";
import { formatKes } from "@/lib/utils";
import { mediaUrl, photoSrcSet, variant } from "@/lib/media-url";

export type ListingCardData = {
  slug: string; title: string; rent: number; area: string; county: string; bedrooms: number;
  coverPath?: string | null; verified?: boolean; rating?: number; reviewCount?: number; managedByCaretaker?: boolean;
  unitsAvailable?: number; distanceKm?: number | null;
};

/** House photography is the only colour on the screen. The placeholder stays grey. */
export function ListingCard({ listing }: { listing: ListingCardData }) {
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-background">
      <Link href={`/listing/${listing.slug}`} className="block">
        <div className="relative aspect-[4/3] bg-surface">
          {listing.coverPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(variant(listing.coverPath, 480))} srcSet={photoSrcSet(listing.coverPath)} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
              alt={listing.title} loading="lazy" decoding="async" className="size-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-muted"><Home className="size-8" aria-hidden /><span className="sr-only">No photo</span></div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-lg font-semibold">{formatKes(listing.rent)}<span className="text-sm font-normal text-muted"> / month</span></p>
            {listing.rating !== undefined && <Rating value={listing.rating} count={listing.reviewCount} />}
          </div>
          <h3 className="line-clamp-1 text-base font-medium">{listing.title}</h3>
          <p className="flex items-center gap-1 text-sm text-muted">
            <MapPin className="size-4 shrink-0" aria-hidden />{listing.area ? `${listing.area}, ` : ""}{listing.county}
            {listing.distanceKm != null && <span> · {listing.distanceKm.toFixed(1)} km away</span>}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-sm">
            <span>{listing.bedrooms === 0 ? "No bedroom" : `${listing.bedrooms} bed`}</span>
            {listing.unitsAvailable !== undefined && listing.unitsAvailable > 1 && <span>{listing.unitsAvailable} units available</span>}
            {listing.verified && <VerifiedBadge />}
            {listing.managedByCaretaker && <span className="text-muted">Managed by caretaker</span>}
          </div>
        </div>
      </Link>
    </article>
  );
}

export const toCard = (r: import("@/lib/types").SearchRow): ListingCardData => ({
  slug: r.slug, title: r.title, rent: r.rent, area: r.estate ?? r.sub_county ?? "", county: r.county, bedrooms: r.bedrooms,
  coverPath: r.cover_path, managedByCaretaker: r.managed_by_caretaker, unitsAvailable: r.units_available,
  distanceKm: r.distance_m == null ? null : r.distance_m / 1000,
});
