import { createPublicClient } from "@/lib/supabase/public";
import type { SearchRow } from "@/lib/types";

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const many = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : v.split(",")).filter(Boolean);
const num = (v: string | string[] | undefined) => {
  const s = one(v); if (!s) return undefined;
  const n = Number(s.replace(/,/g, "")); return Number.isFinite(n) ? n : undefined;
};

export const PAGE_SIZE = 24;

/** URL query string to the filter object the SQL function expects. The URL is the single source of truth. */
export function parseFilters(p: Params) {
  const f: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => { if (v !== undefined && v !== "") f[k] = v; };
  set("county", one(p.county)); set("sub_county", one(p.sub_county)); set("ward", one(p.ward)); set("estate", one(p.estate)); set("q", one(p.q));
  set("min_rent", num(p.min_rent)); set("max_rent", num(p.max_rent)); set("max_deposit", num(p.max_deposit));
  const types = many(p.type); if (types.length) f.types = types;
  set("min_bedrooms", num(p.min_bedrooms)); set("max_bedrooms", num(p.max_bedrooms)); set("min_bathrooms", num(p.min_bathrooms));
  set("min_size", num(p.min_size)); set("floor", num(p.floor)); set("available_by", one(p.available_by));
  set("posted_within_days", num(p.posted_within_days)); set("managed_by", one(p.managed_by));
  const amen = many(p.amenity); if (amen.length) f.amenities = amen;
  const lat = num(p.lat), lng = num(p.lng);
  if (lat !== undefined && lng !== undefined) { f.lat = lat; f.lng = lng; set("radius_m", num(p.radius_m) ?? 5000); }
  if (one(p.verified_only) === "on" || one(p.verified_only) === "true") f.verified_only = true;
  set("sort", one(p.sort));
  const page = Math.max(1, num(p.page) ?? 1);
  f.limit = one(p.view) === "map" ? 200 : PAGE_SIZE;
  f.offset = one(p.view) === "map" ? 0 : (page - 1) * PAGE_SIZE;
  return { filters: f, page };
}

export async function searchListings(filters: Record<string, unknown>): Promise<SearchRow[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("search_listings", { filters });
  if (error) { console.error("search_listings", error.message); return []; }
  return (data ?? []) as SearchRow[];
}
