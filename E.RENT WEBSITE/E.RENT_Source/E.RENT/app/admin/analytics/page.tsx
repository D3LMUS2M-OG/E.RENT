import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL, type ListingStatus } from "@/lib/types";

export const metadata = { title: "Analytics" };
const card = "rounded-[20px] border border-border bg-surface p-4";

type Stats = { users: number; new_users_30d: number; landlords: number; verified_landlords: number; listings_by_status: Record<string, number>; requests: number; requests_30d: number; rentals_confirmed: number; conversations: number; reviews: number; views_30d: number; users_by_week: { week: string; n: number }[]; listings_by_county: { county: string; n: number }[] };

export default async function AdminAnalytics() {
  await getAccess("/admin/analytics");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("platform_stats");
  if (error || !data) return <p className={card}>Could not load the numbers. Run the 20261120001500 migration.</p>;
  const s = data as Stats;
  const tiles: [string, number, string?][] = [
    ["People signed up", s.users, `${s.new_users_30d} in the last 30 days`], ["Landlords", s.landlords, `${s.verified_landlords} verified`], ["Requests sent", s.requests, `${s.requests_30d} in the last 30 days`],
    ["Rentals confirmed", s.rentals_confirmed], ["Chats started", s.conversations], ["Reviews", s.reviews], ["House views (30 days)", Number(s.views_30d)],
  ];
  const maxCounty = Math.max(1, ...s.listings_by_county.map((c) => c.n)); const maxWeek = Math.max(1, ...s.users_by_week.map((w) => w.n));
  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Analytics</h1>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">{tiles.map(([l, n, sub]) => <li key={l} className={card}><p className="text-3xl font-semibold tabular-nums">{n.toLocaleString("en-KE")}</p><p className="text-sm font-medium">{l}</p>{sub && <p className="text-xs text-muted">{sub}</p>}</li>)}</ul>
      <section aria-labelledby="st" className="space-y-3"><h2 id="st" className="text-2xl">Listings by status</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(s.listings_by_status).map(([k, n]) => <div key={k} className={card}><dt className="text-sm text-muted">{STATUS_LABEL[k as ListingStatus] ?? k}</dt><dd className="text-2xl font-semibold">{n}</dd></div>)}</dl></section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="cn" className={card}><h2 id="cn" className="text-xl">Live listings by county</h2>
          {s.listings_by_county.length === 0 ? <p className="mt-2 text-sm text-muted">No live listings yet.</p> : <ul className="mt-3 space-y-2">{s.listings_by_county.map((c) => <li key={c.county} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2 text-sm"><span className="truncate">{c.county}</span><span className="h-2.5 rounded-full bg-primary" style={{ width: `${(c.n / maxCounty) * 100}%` }} /><b className="text-right tabular-nums">{c.n}</b></li>)}</ul>}</section>
        <section aria-labelledby="wk" className={card}><h2 id="wk" className="text-xl">New people per week</h2>
          {s.users_by_week.length === 0 ? <p className="mt-2 text-sm text-muted">No sign-ups in the last 8 weeks.</p> : <ul className="mt-3 space-y-2">{s.users_by_week.map((w) => <li key={w.week} className="grid grid-cols-[6rem_1fr_2rem] items-center gap-2 text-sm"><span>{new Date(w.week).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</span><span className="h-2.5 rounded-full bg-primary" style={{ width: `${(w.n / maxWeek) * 100}%` }} /><b className="text-right tabular-nums">{w.n}</b></li>)}</ul>}</section>
      </div>
    </div>
  );
}
