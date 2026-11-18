import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Reports" };
const REASON: Record<string, string> = { scam: "Scam", pressure_to_pay: "Asked to pay first", harassment: "Harassment", fake_listing: "Fake listing", inappropriate: "Inappropriate", other: "Other" };

export default async function Reports() {
  const supabase = await createClient();
  const { data } = await supabase.from("reports").select("id, reason, status, created_at, reporter_id, reported_user_id").order("created_at", { ascending: false }).limit(100);
  const ids = [...new Set((data ?? []).flatMap((r) => [r.reporter_id, r.reported_user_id]))];
  const { data: names } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const name = (id: string) => names?.find((n) => n.id === id)?.full_name || "Unnamed";
  const open = (data ?? []).filter((r) => r.status === "open"); const done = (data ?? []).filter((r) => r.status !== "open");
  const row = (r: NonNullable<typeof data>[number]) => (
    <li key={r.id}><Link href={`/admin/reports/${r.id}`} className="flex flex-col gap-1 p-4 hover:bg-surface sm:flex-row sm:items-center sm:justify-between">
      <span><span className="font-medium">{REASON[r.reason]}</span><span className="ml-2 text-sm text-muted">{name(r.reporter_id)} reported {name(r.reported_user_id)}</span></span>
      <span className="text-sm text-muted">{new Date(r.created_at).toLocaleDateString("en-KE")} · <span className="capitalize">{r.status}</span></span></Link></li>);
  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight">Reported conversations</h1>
      <section aria-labelledby="o" className="space-y-3"><h2 id="o" className="text-xl font-semibold">Open ({open.length})</h2>
        {open.length === 0 ? <p className="text-muted">Nothing open.</p> : <ul className="divide-y divide-border rounded-[20px] border border-border bg-surface">{open.map(row)}</ul>}</section>
      {done.length > 0 && <section aria-labelledby="d" className="space-y-3"><h2 id="d" className="text-xl font-semibold">Closed</h2><ul className="divide-y divide-border rounded-[20px] border border-border bg-surface">{done.map(row)}</ul></section>}
    </div>
  );
}
