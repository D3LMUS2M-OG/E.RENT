import { countyBySlug } from "@/lib/counties";
import { createPublicClient } from "@/lib/supabase/public";

export type GeoRow = { id: number; name: string; slug: string };

export async function listSubCounties(countyCode: number): Promise<GeoRow[]> {
  const { data } = await createPublicClient().from("sub_counties").select("id,name,slug").eq("county_id", countyCode).order("name");
  return (data ?? []) as GeoRow[];
}
export async function getSubCounty(countySlug: string, subSlug: string) {
  const county = countyBySlug(countySlug); if (!county) return null;
  const { data } = await createPublicClient().from("sub_counties").select("id,name,slug").eq("county_id", county.code).eq("slug", subSlug).maybeSingle();
  return data ? { county, sub: data as GeoRow } : null;
}
export async function listWards(subId: number): Promise<GeoRow[]> {
  const { data } = await createPublicClient().from("wards").select("id,name,slug").eq("sub_county_id", subId).order("name");
  return (data ?? []) as GeoRow[];
}
export async function getWard(subId: number, wardSlug: string) {
  const { data } = await createPublicClient().from("wards").select("id,name,slug").eq("sub_county_id", subId).eq("slug", wardSlug).maybeSingle();
  return (data ?? null) as GeoRow | null;
}
