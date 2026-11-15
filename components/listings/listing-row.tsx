import Link from "next/link";
import { Home, MapPin } from "lucide-react";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Rating } from "@/components/ui/rating";
import { formatKes } from "@/lib/utils";
import { mediaUrl, photoSrcSet, variant } from "@/lib/media-url";
import type { ListingCardData } from "./listing-card";

/** The compact list layout: a small photo on the left, the details on the right. */
export function ListingRow({ listing }: { listing: ListingCardData }) {
  const photo = listing.photos?.[0] ?? listing.coverPath ?? null;
  return (
    <article className="overflow-hidden rounded-[22px] border border-border bg-surface p-2 transition-colors hover:bg-surface-2">
      <Link href={`/listing/${listing.slug}`} className="flex gap-3">
        <div className="aspect-[4/3] w-32 shrink-0 overflow-hidden rounded-[16px] bg-surface-2 sm:w-52">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(variant(photo, 480))} srcSet={photoSrcSet(photo)} sizes="(min-width:640px) 208px, 128px" alt={listing.title} loading="lazy" decoding="async" className="size-full rounded-[16px] object-cover" />
          ) : <div className="grid size-full place-items-center text-muted"><Home className="size-7" aria-hidden /><span className="sr-only">No photo</span></div>}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between py-1 pr-2">
          <div className="space-y-1">
            <p className="text-xl font-semibold leading-tight text-accent sm:text-2xl">{formatKes(listing.rent)}<span className="ml-1 text-xs font-normal text-muted sm:text-sm">/ month</span></p>
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug sm:text-base">{listing.title}</h3>
            <p className="flex items-center gap-1 text-sm text-muted"><MapPin className="size-4 shrink-0" aria-hidden /><span className="truncate">{listing.area ? `${listing.area}, ` : ""}{listing.county}</span></p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span>{listing.bedrooms === 0 ? "No bedroom" : `${listing.bedrooms} bed`}</span>
            {listing.unitsAvailable !== undefined && listing.unitsAvailable > 1 && <span className="text-muted">{listing.unitsAvailable} units</span>}
            {listing.rating !== undefined && <Rating value={listing.rating} count={listing.reviewCount} />}
            {listing.verified && <VerifiedBadge />}
          </div>
        </div>
      </Link>
    </article>
  );
}
