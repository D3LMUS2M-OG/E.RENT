import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Verifications" };

export default async function Verifications() {
  const supabase = await createClient();
  const [pending, done] = await Promise.all([
    supabase.from("landlord_verifications").select("id, user_id, submitted_at, ownership_kind").eq("status", "pending").order("submitted_at"),
    supabase.from("landlord_verifications").select("id, user_id, status, reviewed_at").in("status", ["approved", "rejected"]).order("reviewed_at", { ascending: false }).limit(20),
  ]);
  const ids = [...(pending.data ?? []), ...(done.data ?? [])].map((r) => r.user_id);
  const { data: names } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const name = (id: string) => names?.find((n) => n.id === id)?.full_name || "Unnamed landlord";

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight">Verifications</h1>
      <section aria-labelledby="q" className="space-y-3">
        <h2 id="q" className="text-xl font-semibold">Waiting ({pending.data?.length ?? 0})</h2>
        {!pending.data?.length && <p className="text-muted">Nothing waiting.</p>}
        <ul className="divide-y divide-border rounded-lg border border-border">
          {pending.data?.map((v) => (
            <li key={v.id}><Link href={`/admin/verifications/${v.id}`} className="flex items-center justify-between p-4 hover:bg-surface">
              <span className="font-medium">{name(v.user_id)}</span>
              <span className="text-sm text-muted">{v.ownership_kind?.replace("_", " ")} · {v.submitted_at && new Date(v.submitted_at).toLocaleDateString("en-KE")}</span>
            </Link></li>))}
        </ul>
      </section>
      <section aria-labelledby="d" className="space-y-3">
        <h2 id="d" className="text-xl font-semibold">Recent decisions</h2>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {done.data?.map((v) => (
            <li key={v.id}><Link href={`/admin/verifications/${v.id}`} className="flex items-center justify-between p-4 hover:bg-surface">
              <span>{name(v.user_id)}</span><span className="text-sm font-medium capitalize">{v.status}</span></Link></li>))}
          {!done.data?.length && <li className="p-4 text-muted">No decisions yet.</li>}
        </ul>
      </section>
    </div>
  );
}
