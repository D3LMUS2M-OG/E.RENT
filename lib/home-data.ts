import { createPublicClient } from "@/lib/supabase/public";
import { mediaUrl } from "@/lib/media-url";

export type Landlord = { id: string; name: string; since: number; avatar: string | null; verified: boolean };
export type Walkthrough = { src: string; slug: string; title: string };

/** Real numbers and real people only. Anything that fails returns nothing, never an invented value. */
export async function getHomeData() {
  const out = { landlords: [] as Landlord[], verifiedCount: 0, videos: [] as Walkthrough[] };
  try {
    const sb = createPublicClient();
    const { data, count } = await sb.from("landlord_profiles").select("id, display_name, member_since, verified, avatar_url", { count: "exact" }).eq("verified", true).order("member_since", { ascending: false }).limit(10);
    out.verifiedCount = count ?? data?.length ?? 0;
    out.landlords = (data ?? []).map((r) => ({ id: r.id as string, name: (r.display_name as string) || "Landlord", since: new Date(r.member_since as string).getFullYear(), avatar: (r.avatar_url as string | null) ?? null, verified: true }));

    const { data: vids } = await sb.from("listing_media").select("path_video, listing_id").eq("kind", "video").not("path_video", "is", null).order("created_at", { ascending: false }).limit(12);
    const ids = [...new Set((vids ?? []).map((v) => v.listing_id as string))];
    if (ids.length) {
      const { data: ls } = await sb.from("listings").select("id, slug, title").in("id", ids).eq("status", "active").gt("expires_at", new Date().toISOString());
      const byId = new Map((ls ?? []).map((l) => [l.id as string, l]));
      out.videos = (vids ?? []).flatMap((v) => { const l = byId.get(v.listing_id as string); return l ? [{ src: mediaUrl(v.path_video as string), slug: l.slug as string, title: l.title as string }] : []; }).slice(0, 4);
    }
  } catch (e) { console.error("home data", e); }
  return out;
}
