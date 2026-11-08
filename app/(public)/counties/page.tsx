import type { Metadata } from "next";
import Link from "next/link";
import { COUNTIES } from "@/lib/counties";

export const metadata: Metadata = { title: "Houses for rent in all 47 counties" };

export default function CountiesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">All 47 counties</h1>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {COUNTIES.map((c) => (
          <li key={c.slug}>
            <Link href={`/houses-for-rent/${c.slug}`} className="flex min-h-12 items-center justify-between rounded-lg border border-border px-4 hover:bg-surface">
              {c.name}<span className="text-sm text-muted">{String(c.code).padStart(2, "0")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
