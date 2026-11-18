import Link from "next/link";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { searchListings } from "@/lib/search";
import { ListingResults } from "@/components/listings/listing-results";
import { toCard } from "@/components/listings/listing-card";
import { FeedForm } from "@/components/account/feed-form";

export const metadata = { title: "My feed", robots: { index: false } };

export default async function FeedPage() {
  const a = await getAccess("/account/feed");
  const supabase = await createClient();
  const { data: prefs } = await supabase.from("feed_preferences").select("counties, types, max_rent, min_bedrooms").eq("user_id", a.userId).maybeSingle();
  const p = { counties: prefs?.counties ?? [], types: prefs?.types ?? [], max_rent: prefs?.max_rent ?? null, min_bedrooms: prefs?.min_bedrooms ?? null };
  const configured = p.counties.length > 0 || p.types.length > 0 || p.max_rent !== null || p.min_bedrooms !== null;
  const base: Record<string, unknown> = { limit: 12, sort: "newest" };
  if (p.types.length) base.types = p.types; if (p.max_rent) base.max_rent = p.max_rent; if (p.min_bedrooms) base.min_bedrooms = p.min_bedrooms;
  // The search function takes one county at a time, so look in each chosen county and merge the newest first
  const lists = configured ? await Promise.all((p.counties.length ? p.counties : [undefined]).map((c) => searchListings(c ? { ...base, county: c } : base))) : [];
  const seen = new Set<string>();
  const rows = lists.flat().filter((r) => !seen.has(r.id) && seen.add(r.id)).sort((x, y) => +new Date(y.published_at) - +new Date(x.published_at)).slice(0, 24);
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div><h1 className="text-4xl">My feed</h1><p className="mt-2 max-w-prose text-muted">The newest houses that fit what you chose. Change it any time. Want an alert when something new appears? Save a search from the <Link href="/search" className="text-link underline underline-offset-4">search page</Link>.</p></div>
      <div className="max-w-2xl"><FeedForm initial={p} /></div>
      {!configured ? <p className="max-w-md text-muted">Pick a county, a house type or a budget above and your feed fills up here.</p>
        : rows.length === 0 ? <p className="max-w-md text-muted">No houses match yet. New ones show up here as landlords add them, or widen your choices above.</p>
        : <ListingResults listings={rows.map(toCard)} />}
    </div>
  );
}
