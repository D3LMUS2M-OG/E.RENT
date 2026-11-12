import Link from "next/link";
import { ArrowRight, BadgeCheck, GraduationCap, Search, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard, toCard } from "@/components/listings/listing-card";
import { NearMeTile } from "@/components/home/near-me-tile";
import { COUNTIES } from "@/lib/counties";
import { searchListings } from "@/lib/search";

export const revalidate = 300;

const POPULAR = ["nairobi", "kakamega", "kisumu", "nakuru", "mombasa", "kiambu", "uasin-gishu", "machakos"];
const tile = "motion-rise flex min-h-36 flex-col rounded-[24px] border border-border bg-surface p-5 transition-[transform,background-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:bg-surface-2 text-left";

export default async function HomePage() {
  const newest = await searchListings({ limit: 6 });
  const popular = POPULAR.map((s) => COUNTIES.find((c) => c.slug === s)!);
  return (
    <div>
      {/* The only gradient in the app: orange fading into the page */}
      <div className="hero-fade h-40 sm:h-56">
        <div className="mx-auto flex h-full max-w-6xl items-start px-4 pt-6">
          <span className="rounded-full bg-black/85 px-3.5 py-1.5 text-sm font-semibold text-white">47 counties · Chat before you travel</span>
        </div>
      </div>
      <div className="mx-auto -mt-16 max-w-6xl px-4 sm:-mt-24">
        <section className="pb-10">
          <h1 className="motion-rise max-w-3xl text-[clamp(2.4rem,7vw,4.6rem)] leading-[1.02]">Find a house to rent in any of Kenya&rsquo;s 47 counties</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">Chat with the landlord before you travel. Read what past tenants say about the water, the security and the landlord.</p>
          <form action="/search" role="search" className="mt-8 flex max-w-2xl items-center gap-2 rounded-full border border-border-strong bg-surface p-1.5 pl-5">
            <Search className="size-5 shrink-0 text-muted" aria-hidden />
            <label htmlFor="q" className="sr-only">Search by county, estate or words</label>
            <input id="q" name="q" placeholder="Search a county, estate or words" className="min-h-11 min-w-0 flex-1 bg-transparent text-base placeholder:text-muted focus:outline-none" />
            <Button type="submit" size="lg">Search</Button>
          </form>
        </section>

        <section aria-label="Ways to look" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
          <div className={`${tile} sm:col-span-2 lg:row-span-2`}>
            <MapPinned className="size-6 text-accent" aria-hidden />
            <h2 className="mt-3 text-2xl">Browse by county</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {popular.map((c) => <li key={c.slug}><Link href={`/houses-for-rent/${c.slug}`} className="inline-flex min-h-10 items-center rounded-full border border-border px-3.5 text-sm hover:bg-surface-2">{c.name}</Link></li>)}
            </ul>
            <Link href="/counties" className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-4 text-sm font-semibold text-link">All 47 counties<ArrowRight className="size-4" aria-hidden /></Link>
          </div>
          <NearMeTile className={tile} />
          <Link href="/search?type=student-housing" className={tile}><GraduationCap className="size-6 text-accent" aria-hidden /><span className="mt-auto block"><b className="block text-lg">Student housing</b><span className="text-sm text-muted">Near campuses</span></span></Link>
          <Link href="/search?verified_only=on" className={`${tile} border-link/60 sm:col-span-2`}><BadgeCheck className="size-6 text-link" aria-hidden /><span className="mt-auto block"><b className="block text-lg">Verified landlords</b><span className="text-sm text-muted">Look for the blue badge on every listing</span></span></Link>
        </section>

        <section aria-labelledby="newest" className="py-12">
          <div className="flex items-end justify-between gap-4"><h2 id="newest" className="text-3xl">Newest listings</h2>
            {newest.length > 0 && <Link href="/search" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-link">See all<ArrowRight className="size-4" aria-hidden /></Link>}</div>
          {newest.length === 0 ? (
            <p className="mt-3 max-w-xl text-muted">No listings have been published yet. Landlords and caretakers can add the first houses from the dashboard.</p>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{newest.map((r) => <li key={r.id}><ListingCard listing={toCard(r)} /></li>)}</ul>
          )}
        </section>
      </div>
    </div>
  );
}
