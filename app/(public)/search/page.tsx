import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListingCard, toCard } from "@/components/listings/listing-card";
import { ResultsMap } from "@/components/map/results-map";
import { NearMeButton } from "@/components/search/near-me";
import { WhatsAppShare } from "@/components/listings/whatsapp-share";
import { COUNTIES } from "@/lib/counties";
import { PAGE_SIZE, parseFilters, searchListings } from "@/lib/search";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Search houses to rent" };

type SP = Record<string, string | string[] | undefined>;
const sel = "min-h-11 w-full rounded-md border border-border-strong bg-background px-3 text-base";
const val = (p: SP, k: string) => { const v = p[k]; return (Array.isArray(v) ? v[0] : v) ?? ""; };
const list = (p: SP, k: string) => { const v = p[k]; return v === undefined ? [] : Array.isArray(v) ? v : v.split(","); };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { filters, page } = parseFilters(sp);
  const supabase = createPublicClient();
  const [rows, types, amenities] = await Promise.all([
    searchListings(filters),
    supabase.from("property_types").select("slug,name").eq("is_active", true).order("sort"),
    supabase.from("amenities").select("slug,name").eq("is_active", true).order("id"),
  ]);
  const view = val(sp, "view") === "map" ? "map" : "list";
  const total = rows[0]?.total_count ?? 0;
  const pages = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));
  const countyName = COUNTIES.find((c) => c.slug === val(sp, "county"))?.name;

  const qs = (over: Record<string, string>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : v ? [v] : []) u.append(k, x);
    for (const [k, v] of Object.entries(over)) u.set(k, v);
    return `/search?${u.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">{countyName ? `Houses for rent in ${countyName}` : "Search houses to rent"}</h1>

      <form action="/search" className="mt-6 space-y-4" role="search">
        <input type="hidden" name="lat" defaultValue={val(sp, "lat")} />
        <input type="hidden" name="lng" defaultValue={val(sp, "lng")} />
        {view === "map" && <input type="hidden" name="view" value="map" />}
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <div><label htmlFor="q" className="sr-only">Search words or estate</label><Input id="q" name="q" defaultValue={val(sp, "q")} placeholder="Estate or words, for example Milimani" /></div>
          <div><label htmlFor="county" className="sr-only">County</label>
            <select id="county" name="county" defaultValue={val(sp, "county")} className={sel}><option value="">All counties</option>{COUNTIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
          <div><label htmlFor="max_rent" className="sr-only">Maximum rent</label><Input id="max_rent" name="max_rent" inputMode="numeric" defaultValue={val(sp, "max_rent")} placeholder="Max rent, KES" /></div>
          <Button type="submit">Search</Button>
        </div>

        <details className="rounded-lg border border-border" open={Boolean(val(sp, "type") || val(sp, "min_bedrooms") || val(sp, "amenity"))}>
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 font-medium"><SlidersHorizontal className="size-4" aria-hidden />More filters</summary>
          <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><label className="mb-1 block text-sm font-medium" htmlFor="sub_county">Sub-county</label><Input id="sub_county" name="sub_county" defaultValue={val(sp, "sub_county")} /></div>
            <div><label className="mb-1 block text-sm font-medium" htmlFor="min_rent">Minimum rent</label><Input id="min_rent" name="min_rent" inputMode="numeric" defaultValue={val(sp, "min_rent")} /></div>
            <div><label className="mb-1 block text-sm font-medium" htmlFor="max_deposit">Maximum deposit</label><Input id="max_deposit" name="max_deposit" inputMode="numeric" defaultValue={val(sp, "max_deposit")} /></div>
            <div><label className="mb-1 block text-sm font-medium" htmlFor="min_bedrooms">Bedrooms from</label><Input id="min_bedrooms" name="min_bedrooms" inputMode="numeric" defaultValue={val(sp, "min_bedrooms")} /></div>
            <div><label className="mb-1 block text-sm font-medium" htmlFor="max_bedrooms">Bedrooms up to</label><Input id="max_bedrooms" name="max_bedrooms" inputMode="numeric" defaultValue={val(sp, "max_bedrooms")} /></div>
            <div><label className="mb-1 block text-sm font-medium" htmlFor="min_bathrooms">Bathrooms from</label><Input id="min_bathrooms" name="min_bathrooms" inputMode="numeric" defaultValue={val(sp, "min_bathrooms")} /></div>
            <div><label className="mb-1 block text-sm font-medium" htmlFor="min_size">Size from (m²)</label><Input id="min_size" name="min_size" inputMode="numeric" defaultValue={val(sp, "min_size")} /></div>
            <div><label className="mb-1 block text-sm font-medium" htmlFor="floor">Floor</label><Input id="floor" name="floor" inputMode="numeric" defaultValue={val(sp, "floor")} /></div>
            <div><label className="mb-1 block text-sm font-medium" htmlFor="available_by">Available by</label><Input id="available_by" name="available_by" type="date" defaultValue={val(sp, "available_by")} /></div>
            <div><label className="mb-1 block text-sm font-medium" htmlFor="managed_by">Managed by</label>
              <select id="managed_by" name="managed_by" defaultValue={val(sp, "managed_by")} className={sel}><option value="">Anyone</option><option value="owner">The owner</option><option value="caretaker">A caretaker</option></select></div>
            <div><label className="mb-1 block text-sm font-medium" htmlFor="posted_within_days">Posted</label>
              <select id="posted_within_days" name="posted_within_days" defaultValue={val(sp, "posted_within_days")} className={sel}><option value="">Any time</option><option value="1">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></div>
            <div><label className="mb-1 block text-sm font-medium" htmlFor="sort">Sort by</label>
              <select id="sort" name="sort" defaultValue={val(sp, "sort") || "newest"} className={sel}><option value="newest">Newest</option><option value="price_asc">Price, low to high</option><option value="price_desc">Price, high to low</option><option value="distance">Distance</option></select></div>
            <fieldset className="sm:col-span-2 lg:col-span-4"><legend className="mb-2 text-sm font-medium">Property type</legend>
              <div className="flex flex-wrap gap-2">{types.data?.map((t) => (
                <label key={t.slug} className="flex min-h-11 items-center gap-2 rounded-md border border-border px-3"><input type="checkbox" name="type" value={t.slug} defaultChecked={list(sp, "type").includes(t.slug)} className="size-4 accent-[var(--primary)]" />{t.name}</label>))}</div></fieldset>
            <fieldset className="sm:col-span-2 lg:col-span-4"><legend className="mb-2 text-sm font-medium">Amenities</legend>
              <div className="flex flex-wrap gap-2">{amenities.data?.map((a) => (
                <label key={a.slug} className="flex min-h-11 items-center gap-2 rounded-md border border-border px-3"><input type="checkbox" name="amenity" value={a.slug} defaultChecked={list(sp, "amenity").includes(a.slug)} className="size-4 accent-[var(--primary)]" />{a.name}</label>))}</div></fieldset>
            <div className="sm:col-span-2 lg:col-span-4"><Button type="submit">Apply filters</Button></div>
          </div>
        </details>
        <div className="flex flex-wrap items-center gap-3">
          <NearMeButton />
          <Button asChild variant="ghost"><Link href="/search">Clear all</Link></Button>
          <div className="ml-auto flex gap-1" role="group" aria-label="Results view">
            <Button asChild variant={view === "list" ? "primary" : "secondary"}><Link href={qs({ view: "list", page: "1" })} aria-current={view === "list"}>List</Link></Button>
            <Button asChild variant={view === "map" ? "primary" : "secondary"}><Link href={qs({ view: "map" })} aria-current={view === "map"}>Map</Link></Button>
          </div>
        </div>
      </form>

      <p className="mt-8 text-sm text-muted" role="status">{rows.length === 0 ? "No houses match these filters" : `${Number(total).toLocaleString("en-KE")} ${Number(total) === 1 ? "house" : "houses"} found`}</p>

      <div className="mt-4">
        {view === "map" ? <ResultsMap rows={rows} /> : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map((r) => <li key={r.id}><ListingCard listing={toCard(r)} /></li>)}</ul>
        )}
      </div>

      {view === "list" && pages > 1 && (
        <nav aria-label="Pages" className="mt-8 flex items-center justify-between">
          <Button asChild variant="secondary" className={page <= 1 ? "pointer-events-none opacity-40" : ""}><Link href={qs({ page: String(page - 1) })} aria-disabled={page <= 1}>Previous</Link></Button>
          <span className="text-sm text-muted">Page {page} of {pages}</span>
          <Button asChild variant="secondary" className={page >= pages ? "pointer-events-none opacity-40" : ""}><Link href={qs({ page: String(page + 1) })} aria-disabled={page >= pages}>Next</Link></Button>
        </nav>
      )}
      <WhatsAppShare title="Houses to rent on E.Rent" />
    </div>
  );
}
