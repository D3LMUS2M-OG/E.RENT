import type { MetadataRoute } from "next";
import { COUNTIES } from "@/lib/counties";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data } = await createPublicClient().from("listings").select("slug, updated_at").eq("status", "active").gt("expires_at", new Date().toISOString()).limit(5000);
  return [
    { url: base, changeFrequency: "daily" },
    { url: `${base}/counties` },
    { url: `${base}/search` },
    ...COUNTIES.map((c) => ({ url: `${base}/houses-for-rent/${c.slug}`, changeFrequency: "daily" as const })),
    ...(data ?? []).map((l) => ({ url: `${base}/listing/${l.slug}`, lastModified: l.updated_at })),
  ];
}
