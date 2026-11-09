import Link from "next/link";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL, type ListingStatus } from "@/lib/types";

export default async function DashboardHome() {
  const access = await getAccess("/dashboard");
  const supabase = await createClient();
  const { data } = await supabase.from("listings").select("status").in("owner_id", access.landlordIds);
  const counts: Record<string, number> = {};
  (data ?? []).forEach((r) => { counts[r.status] = (counts[r.status] ?? 0) + 1; });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
      {Object.keys(counts).length === 0 ? (
        <div className="space-y-4">
          <p className="max-w-xl text-muted">You have no listings yet. Adding a house takes a few minutes on your phone.</p>
          <Button asChild size="lg"><Link href="/dashboard/listings/new">Add your first house</Link></Button>
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(counts).map(([s, n]) => (
            <div key={s} className="rounded-lg border border-border p-4"><dt className="text-sm text-muted">{STATUS_LABEL[s as ListingStatus]}</dt><dd className="mt-1 text-3xl font-semibold">{n}</dd></div>
          ))}
        </dl>
      )}
      <p className="text-sm text-muted">Views, chats, saves and requests per listing arrive with the analytics step.</p>
    </div>
  );
}
