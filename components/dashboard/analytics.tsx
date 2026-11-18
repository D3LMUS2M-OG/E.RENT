import Link from "next/link";
import { Eye, Heart, Inbox, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL, type ListingStatus } from "@/lib/types";

type Row = { listing_id: string; slug: string; title: string; status: ListingStatus; views: number; chats: number; saves: number; requests: number };

/** Bars for the last 30 days of views. Drawn as plain SVG, so it costs no script. */
function Spark({ days }: { days: { day: string; views: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.views)); const w = 600, h = 90, bw = w / days.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Views per day for the last ${days.length} days. Most in one day: ${max}.`} className="h-24 w-full">
      {days.map((d, i) => { const bh = Math.max(2, (d.views / max) * (h - 8)); return <rect key={d.day} x={i * bw + 2} y={h - bh} width={bw - 4} height={bh} rx={3} style={{ fill: d.views ? "var(--primary)" : "color-mix(in srgb, var(--foreground) 15%, transparent)" }}><title>{`${d.day}: ${d.views} views`}</title></rect>; })}
    </svg>
  );
}

/** Views, chats, saves and requests for the landlord's listings over the last 30 days (saves are all-time). */
export async function Analytics() {
  const supabase = await createClient();
  const [{ data: rows }, { data: days }] = await Promise.all([supabase.rpc("listing_analytics", { p_days: 30 }), supabase.rpc("views_by_day", { p_days: 30 })]);
  const list = ((rows ?? []) as Row[]).map((r) => ({ ...r, views: Number(r.views), chats: Number(r.chats), saves: Number(r.saves), requests: Number(r.requests) }));
  if (list.length === 0) return <p className="text-sm text-muted">Views, chats, saves and requests appear here once you publish a house.</p>;
  const sum = (k: "views" | "chats" | "saves" | "requests") => list.reduce((s, r) => s + r[k], 0);
  const tiles = [[Eye, "Views", sum("views")], [MessageCircle, "New chats", sum("chats")], [Heart, "Saved", sum("saves")], [Inbox, "Requests", sum("requests")]] as const;
  const series = ((days ?? []) as { day: string; views: number }[]).map((d) => ({ day: d.day, views: Number(d.views) }));
  return (
    <section aria-labelledby="analytics" className="space-y-4">
      <div><h2 id="analytics" className="text-2xl">How your houses are doing</h2><p className="text-sm text-muted">Last 30 days. Saved is the total number of people who saved a house.</p></div>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">{tiles.map(([I, l, n]) => <li key={l} className="rounded-[20px] border border-border bg-surface p-4"><I className="size-5 text-accent" aria-hidden /><p className="mt-2 text-3xl font-semibold">{n.toLocaleString("en-KE")}</p><p className="text-sm text-muted">{l}</p></li>)}</ul>
      <div className="rounded-[20px] border border-border bg-surface p-4"><p className="mb-2 text-sm font-medium">Views per day</p><Spark days={series} /></div>
      <div className="overflow-x-auto rounded-[20px] border border-border bg-surface">
        <table className="w-full min-w-[34rem] text-left text-sm"><caption className="sr-only">Numbers per listing</caption>
          <thead><tr className="border-b border-border text-muted"><th scope="col" className="p-3 font-medium">Listing</th><th scope="col" className="p-3 text-right font-medium">Views</th><th scope="col" className="p-3 text-right font-medium">Chats</th><th scope="col" className="p-3 text-right font-medium">Saved</th><th scope="col" className="p-3 text-right font-medium">Requests</th></tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r.listing_id} className="border-b border-border last:border-0">
              <th scope="row" className="max-w-64 p-3 font-medium"><Link href={`/listing/${r.slug}`} className="line-clamp-1 underline-offset-4 hover:underline">{r.title}</Link><span className="text-xs font-normal text-muted">{STATUS_LABEL[r.status]}</span></th>
              <td className="p-3 text-right tabular-nums">{r.views}</td><td className="p-3 text-right tabular-nums">{r.chats}</td><td className="p-3 text-right tabular-nums">{r.saves}</td><td className="p-3 text-right tabular-nums">{r.requests}</td></tr>))}</tbody></table>
      </div>
    </section>
  );
}
