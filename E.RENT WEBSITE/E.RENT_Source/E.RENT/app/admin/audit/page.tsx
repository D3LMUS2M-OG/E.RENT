import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Audit log" };

export default async function AuditLog({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await getAccess("/admin/audit");
  const { q } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("admin_audit_log").select("id, actor_id, action, target_type, target_id, metadata, created_at").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.ilike("action", `%${q.replace(/[%_]/g, "")}%`);
  const { data, error } = await query;
  const ids = [...new Set((data ?? []).map((r) => r.actor_id as string))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const name = new Map((people ?? []).map((p) => [p.id as string, (p.full_name as string) || ""]));
  return (
    <div className="space-y-5">
      <div><h1 className="text-3xl">Audit log</h1><p className="mt-1 max-w-prose text-muted">Every staff action, including each time a reported chat or a verification document is opened. Entries cannot be edited or deleted.</p></div>
      <form role="search" className="flex max-w-md gap-2"><label htmlFor="q" className="sr-only">Filter by action</label><input id="q" name="q" defaultValue={q} placeholder="Filter, for example report or staff" className="min-h-11 flex-1 rounded-full border border-border-strong bg-background/60 px-4" /><button className="min-h-11 rounded-full bg-primary px-5 font-semibold text-primary-foreground">Filter</button></form>
      {error ? <p className="text-muted">You need the audit permission to read the log.</p> : !data?.length ? <p className="text-muted">Nothing logged yet.</p> : (
        <div className="overflow-x-auto rounded-[20px] border border-border bg-surface"><table className="w-full min-w-[40rem] text-left text-sm"><caption className="sr-only">Staff actions, newest first</caption>
          <thead><tr className="border-b border-border text-muted"><th scope="col" className="p-3 font-medium">When</th><th scope="col" className="p-3 font-medium">Who</th><th scope="col" className="p-3 font-medium">Action</th><th scope="col" className="p-3 font-medium">Target</th></tr></thead>
          <tbody>{data.map((r) => (
            <tr key={r.id} className="border-b border-border align-top last:border-0">
              <td className="whitespace-nowrap p-3 text-muted">{new Date(r.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</td>
              <td className="p-3">{name.get(r.actor_id) || `${String(r.actor_id).slice(0, 8)}…`}</td>
              <td className="p-3 font-medium">{r.action}{Object.keys(r.metadata ?? {}).length > 0 && <span className="block break-all text-xs font-normal text-muted">{JSON.stringify(r.metadata)}</span>}</td>
              <td className="p-3 text-muted">{r.target_type}{r.target_id ? ` · ${String(r.target_id).slice(0, 8)}…` : ""}</td></tr>))}</tbody></table></div>)}
    </div>
  );
}
