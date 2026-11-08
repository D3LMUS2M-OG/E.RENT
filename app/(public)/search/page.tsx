import type { Metadata } from "next";
import { COUNTIES } from "@/lib/counties";

export const metadata: Metadata = { title: "Search houses to rent" };

// Filter state lives in the URL. The SQL search function and map view arrive in Step 7.
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ county?: string; max_rent?: string }> }) {
  const { county, max_rent } = await searchParams;
  const name = COUNTIES.find((c) => c.slug === county)?.name;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Search{name ? `: ${name}` : ""}</h1>
      <p className="mt-3 text-muted">
        {max_rent ? `Up to KES ${Number(max_rent).toLocaleString("en-KE")} per month. ` : ""}
        Search results connect to the database in Step 7.
      </p>
    </div>
  );
}
