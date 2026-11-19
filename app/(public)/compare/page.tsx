import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Stars } from "@/components/reviews/stars";
import { mediaUrl, variant } from "@/lib/media-url";
import { formatKes } from "@/lib/utils";
import { MAX_COMPARE } from "@/lib/compare";
import type { Insight } from "@/components/listings/price-insight";

export const metadata: Metadata = { title: "Compare houses", robots: { index: false } };
export const dynamic = "force-dynamic";

type Row = {
  id: string; slug: string; title: string; rent: number; deposit: number; bedrooms: number; bathrooms: number; size_sqm: number | null; floor: number | null; available_from: string; units_available: number; owner_id: string;
  property: { sub_county: string | null; estate: string | null; county: { name: string } };
  type: { name: string } | null; media: { kind: string; path_960: string | null; position: number }[]; amenities: { amenity: { slug: string; name: string } }[];
};

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const slugs = [...new Set((s ?? "").split(",").map((x) => x.trim()).filter((x) => /^[a-z0-9-]{3,120}$/.test(x)))].slice(0, MAX_COMPARE);
  if (slugs.length < 2) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-12"><h1 className="text-4xl">Compare houses</h1>
        <p className="text-muted">Tap <b className="text-foreground">Compare</b> under two to four houses while you search, then open the comparison from the button that appears.</p>
        <Link href="/search" className="inline-flex min-h-12 items-center rounded-full bg-primary px-7 font-semibold text-primary-foreground">Search houses</Link></div>);
  }
  const sb = createPublicClient();
  const { data } = await sb.from("listings").select(`id, slug, title, rent, deposit, bedrooms, bathrooms, size_sqm, floor, available_from, units_available, owner_id,
      property:properties(sub_county, estate, county:counties(name)), type:property_types(name), media:listing_media(kind, path_960, position), amenities:listing_amenities(amenity:amenities(slug, name))`)
    .in("slug", slugs).eq("status", "active").gt("expires_at", new Date().toISOString());
  const rows = slugs.map((sl) => ((data ?? []) as unknown as Row[]).find((r) => r.slug === sl)).filter(Boolean) as Row[];
  if (rows.length < 2) return <div className="mx-auto max-w-2xl space-y-4 px-4 py-12"><h1 className="text-4xl">Compare houses</h1><p className="text-muted">Some of these houses are no longer available. Pick again from the search page.</p><Link href="/search" className="font-semibold text-link underline underline-offset-4">Search houses</Link></div>;

  const owners = [...new Set(rows.map((r) => r.owner_id))];
  const [{ data: lands }, { data: rats }, ...insights] = await Promise.all([
    sb.from("landlord_profiles").select("id, verified").in("id", owners),
    sb.from("listing_ratings").select("listing_id, review_count, avg_overall").in("listing_id", rows.map((r) => r.id)),
    ...rows.map((r) => sb.rpc("price_insight", { p_listing: r.id })),
  ]);
  const verified = new Set((lands ?? []).filter((l) => l.verified).map((l) => l.id as string));
  const rating = new Map((rats ?? []).map((r) => [r.listing_id as string, r]));
  const ins = rows.map((_, i) => ((insights[i]?.data ?? []) as Insight[])[0] ?? null);
  const allAmen = [...new Map(rows.flatMap((r) => r.amenities.map((a) => [a.amenity.slug, a.amenity.name] as const))).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const min = (f: (r: Row) => number | null) => { const v = rows.map(f).filter((x): x is number => x !== null); return v.length ? Math.min(...v) : null; };
  const max = (f: (r: Row) => number | null) => { const v = rows.map(f).filter((x): x is number => x !== null); return v.length ? Math.max(...v) : null; };
  const lowRent = min((r) => r.rent), lowDep = min((r) => r.deposit), bigSize = max((r) => r.size_sqm);
  const Best = () => <span className="ml-2 rounded-md bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">Lowest</span>;
  const Big = () => <span className="ml-2 rounded-md bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">Biggest</span>;

  const lines: [string, (r: Row, i: number) => React.ReactNode][] = [
    ["Rent per month", (r) => <b className="text-lg text-accent">{formatKes(r.rent)}{r.rent === lowRent && rows.length > 1 && <Best />}</b>],
    ["Compared with similar houses", (_, i) => ins[i] ? (ins[i]!.rent < ins[i]!.p25 ? "Lower than most" : ins[i]!.rent > ins[i]!.p75 ? "Higher than most" : "Typical") + ` (middle ${formatKes(ins[i]!.median)})` : <span className="text-muted">Not enough similar houses</span>],
    ["Deposit", (r) => <>{formatKes(r.deposit)}{r.deposit === lowDep && rows.length > 1 && lowDep !== max((x) => x.deposit) && <Best />}</>],
    ["Type", (r) => r.type?.name ?? "—"],
    ["Area", (r) => [r.property.estate, r.property.sub_county, r.property.county.name].filter(Boolean).join(", ")],
    ["Bedrooms", (r) => r.bedrooms === 0 ? "None" : r.bedrooms], ["Bathrooms", (r) => r.bathrooms],
    ["Size", (r) => r.size_sqm ? <>{r.size_sqm} m²{r.size_sqm === bigSize && rows.filter((x) => x.size_sqm).length > 1 && <Big />}</> : "—"],
    ["Floor", (r) => r.floor ?? "—"],
    ["Available from", (r) => new Date(r.available_from).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })],
    ["Units available", (r) => r.units_available],
    ["Landlord", (r) => verified.has(r.owner_id) ? <VerifiedBadge /> : <span className="text-muted">Not verified yet</span>],
    ["Tenant rating", (r) => { const x = rating.get(r.id); return x ? <span className="inline-flex items-center gap-1.5"><Stars value={Number(x.avg_overall)} /><b>{Number(x.avg_overall).toFixed(1)}</b><span className="text-muted">({x.review_count})</span></span> : <span className="text-muted">No reviews yet</span>; }],
  ];
  const th = "sticky left-0 z-10 w-36 min-w-36 bg-surface p-3 text-left text-sm font-medium text-muted";
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl">Compare houses</h1><p className="mt-2 text-muted">Side by side. Scroll sideways on a phone.</p>
      <div className="mt-6 overflow-x-auto rounded-[24px] border border-border bg-surface">
        <table className="w-full border-collapse text-left text-[15px]" style={{ minWidth: `${9 + rows.length * 14}rem` }}><caption className="sr-only">Comparison of {rows.length} houses</caption>
          <thead><tr><td className={th} />{rows.map((r) => { const cover = [...r.media].filter((m) => m.kind === "photo").sort((a, b) => a.position - b.position)[0];
            return <th key={r.id} scope="col" className="min-w-52 p-3 align-top font-normal"><Link href={`/listing/${r.slug}`} className="block space-y-2">
              <span className="block aspect-[4/3] overflow-hidden rounded-[16px] bg-surface-2">{cover?.path_960 && /* eslint-disable-next-line @next/next/no-img-element */ <img src={mediaUrl(variant(cover.path_960, 480))} alt="" className="size-full object-cover" />}</span>
              <span className="line-clamp-2 font-semibold underline-offset-4 hover:underline">{r.title}</span></Link></th>; })}</tr></thead>
          <tbody>
            {lines.map(([label, cell]) => <tr key={label} className="border-t border-border"><th scope="row" className={th}>{label}</th>{rows.map((r, i) => <td key={r.id} className="p-3 align-top">{cell(r, i)}</td>)}</tr>)}
            {allAmen.length > 0 && <tr className="border-t border-border"><th scope="row" className={th}>Amenities</th>{rows.map((r) => <td key={r.id} className="p-3" />)}</tr>}
            {allAmen.map(([slug, name]) => <tr key={slug} className="border-t border-border/60"><th scope="row" className={`${th} font-normal`}>{name}</th>
              {rows.map((r) => { const has = r.amenities.some((a) => a.amenity.slug === slug); return <td key={r.id} className="p-3">{has ? <span className="inline-flex items-center gap-1.5 font-medium"><Check className="size-4 text-accent" aria-hidden />Yes</span> : <span className="inline-flex items-center gap-1.5 text-muted"><Minus className="size-4" aria-hidden />No</span>}</td>; })}</tr>)}
          </tbody></table>
      </div>
    </div>
  );
}
