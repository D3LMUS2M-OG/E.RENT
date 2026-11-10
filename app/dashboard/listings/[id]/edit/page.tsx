import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ListingForm } from "@/components/listings/listing-form";
import { MediaManager, type MediaItem } from "@/components/listings/media-manager";
import { StatusActions } from "@/components/listings/status-actions";
import { STATUS_LABEL, type ListingStatus } from "@/lib/types";
import { updateListing } from "../../../actions";

export const metadata = { title: "Edit listing" };
export const maxDuration = 60; // photo optimisation runs in a server action

export default async function EditListing({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const { created } = await searchParams;
  const access = await getAccess(`/dashboard/listings/${id}/edit`);
  const supabase = await createClient();

  const { data: l } = await supabase.from("listings")
    .select("*, property:properties(*), amenities:listing_amenities(amenity_id), media:listing_media(id,kind,path_480,path_video,blur_data_url,position)")
    .eq("id", id).maybeSingle();
  if (!l || !access.landlordIds.includes(l.owner_id)) notFound();

  const [types, amenities, flags] = await Promise.all([
    supabase.from("property_types").select("id,name").eq("is_active", true).order("sort"),
    supabase.from("amenities").select("id,name,category").eq("is_active", true).order("id"),
    supabase.from("listing_flags").select("id", { count: "exact", head: true }).eq("listing_id", id).eq("status", "open"),
  ]);
  const media = ([...(l.media as (MediaItem & { position: number })[])]).sort((a, b) => a.position - b.position);
  const status = l.status as ListingStatus;
  const isOwner = l.owner_id === access.userId;

  return (
    <div className="max-w-3xl space-y-12">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{l.title}</h1>
          <span className="rounded-md border border-border-strong px-2 py-0.5 text-sm font-medium">{STATUS_LABEL[status]}</span>
        </div>
        {created && <p role="status" className="text-sm font-medium">Saved as a draft. Add at least 3 photos, then publish.</p>}
        {status === "active" && <Link className="text-sm font-medium underline underline-offset-4" href={`/listing/${l.slug}`}>View public page</Link>}
        {status === "taken_down" && <p role="alert" className="text-sm font-medium">A moderator took this listing down: {l.takedown_reason ?? "no reason given"}</p>}
        {(flags.count ?? 0) > 0 && status === "active" && <p className="text-sm text-muted">This listing is waiting for a moderator check.</p>}
        <StatusActions id={id} status={status} isOwner={isOwner} unitsAvailable={l.units_available} />
      </header>

      <MediaManager listingId={id} media={media} />

      <ListingForm
        action={updateListing.bind(null, id)}
        types={types.data ?? []} amenities={amenities.data ?? []} submitLabel="Save changes"
        values={{
          title: l.title, description: l.description, property_type_id: l.property_type_id, rent: l.rent, deposit: l.deposit,
          county_id: l.property.county_id, sub_county_id: l.property.sub_county_id, ward_id: l.property.ward_id, estate: l.property.estate ?? "",
          bedrooms: l.bedrooms, bathrooms: l.bathrooms, size_sqm: l.size_sqm, floor: l.floor, available_from: l.available_from,
          units_total: l.units_total, lat: l.property.lat, lng: l.property.lng, watermark: l.watermark,
          amenities: (l.amenities as { amenity_id: number }[]).map((a) => a.amenity_id), owner_id: l.owner_id,
        }}
      />
    </div>
  );
}
