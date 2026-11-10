import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingCard, toCard } from "@/components/listings/listing-card";
import { getSubCounty, getWard } from "@/lib/geo";
import { searchListings } from "@/lib/search";

export const revalidate = 3600;
export function generateStaticParams() { return []; } // 1,450 pages are rendered on first visit, then cached

type P = { params: Promise<{ county: string; subCounty: string; ward: string }> };

async function load({ county, subCounty, ward }: { county: string; subCounty: string; ward: string }) {
  const g = await getSubCounty(county, subCounty); if (!g) return null;
  const w = await getWard(g.sub.id, ward); if (!w) return null;
  return { ...g, ward: w };
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await params; const g = await load(p);
  if (!g) return {};
  const rows = await searchListings({ county: p.county, sub_county: p.subCounty, ward: p.ward, limit: 1 });
  return {
    title: `Houses for rent in ${g.ward.name}, ${g.sub.name}`,
    description: `Rental houses in ${g.ward.name} ward, ${g.sub.name}, ${g.county.name}.`,
    alternates: { canonical: `/houses-for-rent/${p.county}/${p.subCounty}/${p.ward}` },
    robots: rows.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function WardPage({ params }: P) {
  const p = await params; const g = await load(p);
  if (!g) notFound();
  const rows = await searchListings({ county: p.county, sub_county: p.subCounty, ward: p.ward, limit: 48 });
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="mb-4 flex gap-2 text-sm text-muted">
        <Link className="underline-offset-4 hover:underline" href={`/houses-for-rent/${p.county}`}>{g.county.name}</Link><span aria-hidden>/</span>
        <Link className="underline-offset-4 hover:underline" href={`/houses-for-rent/${p.county}/${p.subCounty}`}>{g.sub.name}</Link>
      </nav>
      <h1 className="text-3xl font-semibold tracking-tight">Houses for rent in {g.ward.name}</h1>
      {rows.length === 0
        ? <p className="mt-3 max-w-xl text-muted">No listings in {g.ward.name} yet.</p>
        : <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map((r) => <li key={r.id}><ListingCard listing={toCard(r)} /></li>)}</ul>}
    </div>
  );
}
