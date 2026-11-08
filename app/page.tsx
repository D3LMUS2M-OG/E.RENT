import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COUNTIES } from "@/lib/counties";

const POPULAR = ["nairobi", "kakamega", "kisumu", "nakuru", "mombasa", "kiambu", "uasin-gishu", "machakos"];

export default function HomePage() {
  const popular = POPULAR.map((s) => COUNTIES.find((c) => c.slug === s)!);
  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-16 sm:py-24">
        <h1 className="max-w-3xl text-[length:var(--text-display)] font-semibold leading-[1.05] tracking-tight motion-rise">
          Find a house to rent in any of Kenya&rsquo;s 47 counties
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Chat with the landlord before you travel. Read what past tenants say about the water, the security and the landlord.
        </p>

        <form action="/search" className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-[1fr_1fr_auto]" role="search">
          <label className="sr-only" htmlFor="county">County</label>
          <select id="county" name="county" defaultValue="" className="min-h-12 rounded-md border border-border-strong bg-background px-3 text-base">
            <option value="">All counties</option>
            {COUNTIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          <label className="sr-only" htmlFor="max_rent">Maximum rent per month (KES)</label>
          <input id="max_rent" name="max_rent" inputMode="numeric" placeholder="Max rent, KES" className="min-h-12 rounded-md border border-border-strong bg-background px-3 text-base placeholder:text-muted" />
          <Button size="lg" type="submit"><Search className="size-4" aria-hidden />Search</Button>
        </form>
      </section>

      <section aria-labelledby="popular" className="border-t border-border py-12">
        <h2 id="popular" className="text-2xl font-semibold tracking-tight">Browse by county</h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {popular.map((c) => (
            <li key={c.slug}>
              <Link href={`/houses-for-rent/${c.slug}`} className="flex min-h-14 items-center justify-between rounded-lg border border-border px-4 font-medium transition-colors hover:bg-surface">
                {c.name}<span className="text-sm text-muted">{String(c.code).padStart(2, "0")}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/counties" className="mt-4 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">All 47 counties</Link>
      </section>

      <section aria-labelledby="newest" className="border-t border-border py-12">
        <h2 id="newest" className="text-2xl font-semibold tracking-tight">Newest listings</h2>
        <p className="mt-3 max-w-xl text-muted">No listings have been published yet. Landlords and caretakers can add the first houses once landlord verification opens.</p>
      </section>
    </div>
  );
}
