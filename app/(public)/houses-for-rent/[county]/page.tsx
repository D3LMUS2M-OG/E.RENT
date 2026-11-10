import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COUNTIES, countyBySlug } from "@/lib/counties";
import { ListingCard, toCard } from "@/components/listings/listing-card";
import { searchListings } from "@/lib/search";
import { listSubCounties } from "@/lib/geo";
import Link from "next/link";

export const revalidate = 3600; // ISR: regenerated from live data (listings query lands in Step 7)

export function generateStaticParams() {
  return COUNTIES.map((c) => ({ county: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ county: string }> }): Promise<Metadata> {
  const county = countyBySlug((await params).county);
  if (!county) return {};
  return {
    title: `Houses for rent in ${county.name}`,
    description: `Rental houses in ${county.name} County, Kenya. Verified landlords, real map pins and tenant reviews.`,
    alternates: { canonical: `/houses-for-rent/${county.slug}` },
  };
}

export default async function CountyPage({ params }: { params: Promise<{ county: string }> }) {
  const county = countyBySlug((await params).county);
  if (!county) notFound();

  const [rows, subs] = await Promise.all([searchListings({ county: county.slug, limit: 48 }), listSubCounties(county.code)]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Houses for rent in ${county.name}`,
    about: { "@type": "AdministrativeArea", name: `${county.name} County, Kenya` },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-3xl font-semibold tracking-tight">Houses for rent in {county.name}</h1>
      {rows.length === 0 ? (
        <p className="mt-3 max-w-xl text-muted">No listings in {county.name} yet. Listings appear here as soon as landlords publish them.</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map((r) => <li key={r.id}><ListingCard listing={toCard(r)} /></li>)}</ul>
      )}
      {subs.length > 0 && (
        <section aria-labelledby="subs" className="mt-12 border-t border-border pt-8">
          <h2 id="subs" className="text-xl font-semibold">Sub-counties in {county.name}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {subs.map((s) => <li key={s.id}><Link className="inline-flex min-h-11 items-center rounded-md border border-border px-3 hover:bg-surface" href={`/houses-for-rent/${county.slug}/${s.slug}`}>{s.name}</Link></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
