import { createClient } from "@/lib/supabase/server";
import { ActionButton } from "@/components/ui/action-button";
import { liftSanction } from "../reports/actions";

export const metadata = { title: "Sanctions" };

export default async function Users() {
  const supabase = await createClient();
  const { data } = await supabase.from("user_sanctions").select("id, user_id, kind, reason, ends_at, created_at, acknowledged_at, lifted_at").order("created_at", { ascending: false }).limit(100);
  const ids = [...new Set((data ?? []).map((s) => s.user_id))];
  const { data: names } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const active = (data ?? []).filter((s) => !s.lifted_at && (!s.ends_at || new Date(s.ends_at) > new Date()) && (["suspension", "ban"].includes(s.kind) || !s.acknowledged_at));
  const rest = (data ?? []).filter((s) => !active.includes(s));
  const row = (s: NonNullable<typeof data>[number], canLift: boolean) => (
    <li key={s.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <span><span className="font-medium capitalize">{s.kind}</span><span className="ml-2">{names?.find((n) => n.id === s.user_id)?.full_name || "Unnamed"}</span>
        <span className="block text-sm text-muted">{s.reason}{s.ends_at && ` · until ${new Date(s.ends_at).toLocaleDateString("en-KE")}`}{s.lifted_at && " · lifted"}</span></span>
      {canLift && <ActionButton action={liftSanction.bind(null, s.id)} variant="secondary" confirmText="Lift this action?">Lift</ActionButton>}
    </li>);
  return (
    <div className="max-w-3xl space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight">Warnings and sanctions</h1>
      <p className="text-sm text-muted">Issue these from a report or a listing. Suspensions and bans also block sign-in.</p>
      <section aria-labelledby="a" className="space-y-3"><h2 id="a" className="text-xl font-semibold">Active ({active.length})</h2>
        {active.length === 0 ? <p className="text-muted">None.</p> : <ul className="divide-y divide-border rounded-lg border border-border">{active.map((s) => row(s, true))}</ul>}</section>
      {rest.length > 0 && <section aria-labelledby="h" className="space-y-3"><h2 id="h" className="text-xl font-semibold">History</h2><ul className="divide-y divide-border rounded-lg border border-border">{rest.map((s) => row(s, false))}</ul></section>}
    </div>
  );
}
