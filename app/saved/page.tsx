import type { Metadata } from "next";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPhotos } from "@/lib/photos";
import { ListingResults } from "@/components/listings/listing-results";

export const metadata: Metadata = { title: "Saved houses", robots: { index: false } };

type Row = { listing: { id: string; slug: string; title: string; rent: number; bedrooms: number; units_available: number;
  property: { estate: string | null; sub_county: string | null; county: { name: string } } } | null };

export default async function SavedPage() {
  const a = await getAccess("/saved");
  const supabase = await createClient();
  const { data } = await supabase.from("favourites")
    .select("created_at, listing:listings(id, slug, title, rent, bedrooms, units_available, property:properties(estate, sub_county, county:counties(name)))")
    .eq("user_id", a.userId).order("created_at", { ascending: false });
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.listing);   // houses taken off the market drop out
  const ids = rows.map((r) => r.listing!.id);
  const photos = await getPhotos(supabase, ids, 3);
  const cards = rows.map(({ listing: l }) => ({ slug: l!.slug, title: l!.title, rent: l!.rent, bedrooms: l!.bedrooms, unitsAvailable: l!.units_available, county: l!.property.county.name, area: l!.property.estate ?? l!.property.sub_county ?? "", photos: photos.get(l!.id) }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl">Saved houses</h1>
      {rows.length === 0 ? (
        <p className="mt-4 max-w-md text-muted">Tap Save on a house and it will wait for you here.</p>
      ) : (
        <div className="mt-6"><ListingResults listings={cards} /></div>
      )}
    </div>
  );
}
