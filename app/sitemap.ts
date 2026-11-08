import type { MetadataRoute } from "next";
import { COUNTIES } from "@/lib/counties";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return [
    { url: base, changeFrequency: "daily" },
    { url: `${base}/counties` },
    ...COUNTIES.map((c) => ({ url: `${base}/houses-for-rent/${c.slug}`, changeFrequency: "daily" as const })),
  ];
}
