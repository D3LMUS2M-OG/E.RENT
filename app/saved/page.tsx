import type { Metadata } from "next";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ListingCard } from "@/components/listings/listing-card";

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
  const { data: ph } = ids.length ? await supabase.rpc("listing_photos", { p_ids: ids, p_n: 3 }) : { data: [] };
  const photos = new Map(((ph ?? []) as { listing_id: string; paths: string[] }[]).map((x) => [x.listing_id, x.paths]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl">Saved houses</h1>
      {rows.length === 0 ? (
        <p className="mt-4 max-w-md text-muted">Tap Save on a house and it will wait for you here.</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ listing: l }) => (
            <li key={l!.id}><ListingCard listing={{ slug: l!.slug, title: l!.title, rent: l!.rent, bedrooms: l!.bedrooms, unitsAvailable: l!.units_available, county: l!.property.county.name, area: l!.property.estate ?? l!.property.sub_county ?? "", photos: photos.get(l!.id) }} /></li>))}
        </ul>
      )}
    </div>
  );
}
