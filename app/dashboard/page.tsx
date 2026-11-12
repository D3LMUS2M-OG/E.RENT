import Link from "next/link";
import { BadgeCheck, Building2, Inbox, MessageCircle } from "lucide-react";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL, type ListingStatus } from "@/lib/types";

const tile = "motion-rise flex min-h-36 flex-col justify-between rounded-[24px] border border-border bg-surface p-5 transition-[transform,background-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:bg-surface-2";

export default async function DashboardHome() {
  const access = await getAccess("/dashboard");
  const supabase = await createClient();
  const [{ data: listings }, { data: inc }, { data: ver }] = await Promise.all([
    supabase.from("listings").select("status").in("owner_id", access.landlordIds),
    supabase.rpc("incoming_requests"),
    supabase.from("landlord_verifications").select("status").eq("user_id", access.userId).maybeSingle(),
  ]);
  const counts: Record<string, number> = {};
  (listings ?? []).forEach((r) => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
  const waiting = ((inc ?? []) as { status: string }[]).filter((r) => r.status === "pending").length;
  const verified = ver?.status === "approved";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-4xl">Overview</h1><Button asChild><Link href="/dashboard/listings/new">Add a house</Link></Button></div>

      <section aria-label="At a glance" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/listings" className={tile}><Building2 className="size-6 text-muted" aria-hidden /><span><b className="block text-4xl font-semibold">{counts.active ?? 0}</b><span className="text-sm text-muted">Listings live</span></span></Link>
        <Link href="/dashboard/requests" className={`${tile} ${waiting ? "border-primary" : ""}`}><Inbox className="size-6 text-accent" aria-hidden /><span><b className="block text-4xl font-semibold">{waiting}</b><span className="text-sm text-muted">{waiting === 1 ? "Request waiting" : "Requests waiting"}</span></span></Link>
        <Link href="/chats" className={tile}><MessageCircle className="size-6 text-muted" aria-hidden /><span><b className="block text-lg">Chats</b><span className="text-sm text-muted">Messages from tenants</span></span></Link>
        <Link href="/dashboard/verification" className={`${tile} border-link/60`}><BadgeCheck className="size-6 text-link" aria-hidden /><span><b className="block text-lg">{verified ? "You are verified" : "Get verified"}</b><span className="text-sm text-muted">{verified ? "Your badge shows on every listing" : "Tenants trust and answer verified landlords"}</span></span></Link>
      </section>

      {Object.keys(counts).length === 0 ? (
        <p className="max-w-xl text-muted">You have no listings yet. Adding a house takes a few minutes on your phone.</p>
      ) : (
        <section aria-labelledby="status" className="space-y-3"><h2 id="status" className="text-2xl">Your listings by status</h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(counts).map(([st, n]) => (
              <div key={st} className="rounded-[20px] border border-border bg-surface p-4"><dt className="text-sm text-muted">{STATUS_LABEL[st as ListingStatus]}</dt><dd className="mt-1 text-3xl font-semibold">{n}</dd></div>))}
          </dl></section>
      )}
      <p className="text-sm text-muted">Views, chats, saves and requests per listing arrive with the analytics step.</p>
    </div>
  );
}
