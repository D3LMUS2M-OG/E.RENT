import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Rating } from "@/components/ui/rating";
import { ListingCard } from "@/components/listings/listing-card";

export const metadata: Metadata = { title: "Component library", robots: { index: false } };

const sample = { slug: "sample", title: "Sample: 2 bedroom with parking", rent: 22000, area: "Milimani", county: "Kakamega", bedrooms: 2, verified: true, rating: 4.6, reviewCount: 12 };

// Dev and preview only. Step 1 "Done when": contrast, focus and reduced motion verified here.
export default function DesignPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Component library</h1>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button><Button loading>Saving</Button>
        </div>
      </section>
      <section className="max-w-sm space-y-4">
        <h2 className="text-xl font-semibold">Inputs</h2>
        <Field label="Email" htmlFor="d-email"><Input id="d-email" placeholder="you@example.com" /></Field>
        <Field label="Email with error" htmlFor="d-err" error="Enter a valid email address"><Input id="d-err" aria-invalid defaultValue="nope" /></Field>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Status by shape, icon and text</h2>
        <div className="flex items-center gap-4"><VerifiedBadge /><Rating value={4.6} count={12} /></div>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Listing card and loading state</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ListingCard listing={sample} />
          <div className="space-y-3 rounded-[20px] border border-border bg-surface p-4"><Skeleton className="aspect-[4/3]" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-4 w-3/4" /></div>
        </div>
      </section>
    </div>
  );
}
