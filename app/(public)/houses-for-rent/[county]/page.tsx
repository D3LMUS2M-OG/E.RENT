import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COUNTIES, countyBySlug } from "@/lib/counties";

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
      <p className="mt-3 max-w-xl text-muted">No listings in {county.name} yet. Listings appear here as soon as landlords publish them.</p>
    </div>
  );
}
