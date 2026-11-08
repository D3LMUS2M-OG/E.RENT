import Image from "next/image";
import Link from "next/link";
import { Home, MapPin } from "lucide-react";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Rating } from "@/components/ui/rating";
import { formatKes } from "@/lib/utils";

export type ListingCardData = {
  slug: string;
  title: string;
  rent: number;
  area: string;
  county: string;
  bedrooms: number;
  coverUrl?: string;
  verified?: boolean;
  rating?: number;
  reviewCount?: number;
  managedByCaretaker?: boolean;
};

/** House photography is the only colour on the screen. The placeholder stays grey. */
export function ListingCard({ listing }: { listing: ListingCardData }) {
  return (
    <article className="group overflow-hidden rounded-lg border border-border bg-background">
      <Link href={`/listing/${listing.slug}`} className="block">
        <div className="relative aspect-[4/3] bg-surface">
          {listing.coverUrl ? (
            <Image src={listing.coverUrl} alt={listing.title} fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover" />
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
          <p className="flex items-center gap-1 text-sm text-muted"><MapPin className="size-4" aria-hidden />{listing.area}, {listing.county}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
            <span>{listing.bedrooms === 0 ? "Single room" : `${listing.bedrooms} bed`}</span>
            {listing.verified && <VerifiedBadge />}
            {listing.managedByCaretaker && <span className="text-muted">Managed by caretaker</span>}
          </div>
        </div>
      </Link>
    </article>
  );
}
