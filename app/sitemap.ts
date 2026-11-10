import type { MetadataRoute } from "next";
import { COUNTIES } from "@/lib/counties";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data } = await createPublicClient().from("listings").select("slug, updated_at").eq("status", "active").gt("expires_at", new Date().toISOString()).limit(5000);
  // Sub-county and ward pages only when they have live listings (no thin pages in the sitemap)
  const { data: geo } = await createPublicClient().from("properties")
    .select("county_id, sub:sub_counties(slug), ward:wards(slug), listings!inner(status)").eq("listings.status", "active").limit(5000);
  const seen = new Set<string>(); const geoUrls: MetadataRoute.Sitemap = [];
  for (const r of (geo ?? []) as unknown as { county_id: number; sub: { slug: string } | null; ward: { slug: string } | null }[]) {
    const c = COUNTIES.find((x) => x.code === r.county_id); if (!c || !r.sub) continue;
    for (const u of [`${base}/houses-for-rent/${c.slug}/${r.sub.slug}`, r.ward && `${base}/houses-for-rent/${c.slug}/${r.sub.slug}/${r.ward.slug}`]) {
      if (u && !seen.has(u)) { seen.add(u); geoUrls.push({ url: u, changeFrequency: "daily" }); }
    }
  }
  return [
    { url: base, changeFrequency: "daily" },
    { url: `${base}/counties` },
    { url: `${base}/search` },
    ...COUNTIES.map((c) => ({ url: `${base}/houses-for-rent/${c.slug}`, changeFrequency: "daily" as const })),
    ...geoUrls,
    ...(data ?? []).map((l) => ({ url: `${base}/listing/${l.slug}`, lastModified: l.updated_at })),
  ];
}
