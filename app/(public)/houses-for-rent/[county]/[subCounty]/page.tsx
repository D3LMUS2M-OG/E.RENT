import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingCard, toCard } from "@/components/listings/listing-card";
import { getSubCounty, listWards } from "@/lib/geo";
import { searchListings } from "@/lib/search";

export const revalidate = 3600;
export function generateStaticParams() { return []; } // 304 pages are rendered on first visit, then cached

type P = { params: Promise<{ county: string; subCounty: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { county, subCounty } = await params;
  const g = await getSubCounty(county, subCounty);
  if (!g) return {};
  const rows = await searchListings({ county, sub_county: subCounty, limit: 1 });
  return {
    title: `Houses for rent in ${g.sub.name}, ${g.county.name}`,
    description: `Rental houses in ${g.sub.name} sub-county, ${g.county.name}. Verified landlords, real map pins and tenant reviews.`,
    alternates: { canonical: `/houses-for-rent/${county}/${subCounty}` },
    robots: rows.length === 0 ? { index: false, follow: true } : undefined, // no thin pages in Google
  };
}

export default async function SubCountyPage({ params }: P) {
  const { county, subCounty } = await params;
  const g = await getSubCounty(county, subCounty);
  if (!g) notFound();
  const [rows, wards] = await Promise.all([searchListings({ county, sub_county: subCounty, limit: 48 }), listWards(g.sub.id)]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
        <Link className="underline-offset-4 hover:underline" href={`/houses-for-rent/${county}`}>{g.county.name}</Link>
      </nav>
      <h1 className="text-3xl font-semibold tracking-tight">Houses for rent in {g.sub.name}</h1>
      {rows.length === 0
        ? <p className="mt-3 max-w-xl text-muted">No listings in {g.sub.name} yet. Listings appear here as soon as landlords publish them.</p>
        : <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map((r) => <li key={r.id}><ListingCard listing={toCard(r)} /></li>)}</ul>}
      {wards.length > 0 && (
        <section aria-labelledby="wards" className="mt-12 border-t border-border pt-8">
          <h2 id="wards" className="text-xl font-semibold">Wards in {g.sub.name}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {wards.map((w) => <li key={w.id}><Link className="inline-flex min-h-11 items-center rounded-md border border-border px-3 hover:bg-surface" href={`/houses-for-rent/${county}/${subCounty}/${w.slug}`}>{w.name}</Link></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
