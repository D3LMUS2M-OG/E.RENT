import type { SupabaseClient } from "@supabase/supabase-js";

/** First few photos of many listings. Uses the listing_photos function and falls back to a plain query if it is not installed yet. */
export async function getPhotos(supabase: SupabaseClient, ids: string[], n = 3): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (!ids.length) return out;
  const { data, error } = await supabase.rpc("listing_photos", { p_ids: ids, p_n: n });
  if (!error && data) { for (const r of data as { listing_id: string; paths: string[] }[]) out.set(r.listing_id, r.paths); return out; }
  const { data: rows } = await supabase.from("listing_media").select("listing_id, path_960, position").in("listing_id", ids).eq("kind", "photo").order("position");
  for (const r of (rows ?? []) as { listing_id: string; path_960: string | null }[]) {
    if (!r.path_960) continue;
    const list = out.get(r.listing_id) ?? [];
    if (list.length < n) { list.push(r.path_960); out.set(r.listing_id, list); }
  }
  return out;
}
