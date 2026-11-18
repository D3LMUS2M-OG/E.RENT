import { COUNTIES } from "@/lib/counties";
import { HOUSE_TYPES } from "@/lib/catalog";

/** The search page URL keys that describe *what* to find. Page, view and sort are left out on purpose. */
export const SEARCH_KEYS = ["county", "sub_county", "ward", "estate", "q", "min_rent", "max_rent", "max_deposit", "type", "min_bedrooms", "max_bedrooms", "min_bathrooms", "min_size", "floor", "available_by", "posted_within_days", "managed_by", "amenity", "lat", "lng", "radius_m", "verified_only"] as const;

/** Keeps only the allowed keys, in a stable order, so the same search always gives the same text. */
export function cleanQuery(raw: string): string {
  const src = new URLSearchParams(raw); const out = new URLSearchParams();
  for (const k of SEARCH_KEYS) for (const v of src.getAll(k)) if (v.trim()) out.append(k, v.trim().slice(0, 120));
  return out.toString();
}

const kes = (n: string) => `KES ${Number(n).toLocaleString("en-KE")}`;

/** A readable name: "Kakamega · Bedsitter · 2+ bedrooms · under KES 25,000". */
export function describeSearch(query: string): string {
  const q = new URLSearchParams(query); const parts: string[] = [];
  const county = COUNTIES.find((c) => c.slug === q.get("county"))?.name; if (county) parts.push(county);
  if (q.get("estate")) parts.push(q.get("estate")!); else if (q.get("ward")) parts.push(q.get("ward")!);
  const types = q.getAll("type").flatMap((s) => s.split(",")).map((s) => HOUSE_TYPES.find(([slug]) => slug === s)?.[1]).filter(Boolean); if (types.length) parts.push(types.join(" or ") as string);
  if (q.get("min_bedrooms")) parts.push(`${q.get("min_bedrooms")}+ bedrooms`);
  if (q.get("min_rent") && q.get("max_rent")) parts.push(`${kes(q.get("min_rent")!)} to ${kes(q.get("max_rent")!)}`); else if (q.get("max_rent")) parts.push(`under ${kes(q.get("max_rent")!)}`); else if (q.get("min_rent")) parts.push(`over ${kes(q.get("min_rent")!)}`);
  if (q.get("verified_only")) parts.push("verified landlords");
  if (q.get("q")) parts.push(`"${q.get("q")}"`);
  if (q.get("lat")) parts.push("near me");
  return parts.join(" · ") || "All houses";
}
