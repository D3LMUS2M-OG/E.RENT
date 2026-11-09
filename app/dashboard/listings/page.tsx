import Link from "next/link";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { formatKes } from "@/lib/utils";
import { STATUS_LABEL, type ListingStatus } from "@/lib/types";

export const metadata = { title: "My listings" };

export default async function MyListings() {
  const access = await getAccess("/dashboard/listings");
  const supabase = await createClient();
  const { data } = await supabase.from("listings")
    .select("id, title, rent, status, units_available, units_total, expires_at, owner_id, created_by")
    .in("owner_id", access.landlordIds).order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">My listings</h1>
        <Button asChild><Link href="/dashboard/listings/new">Add a house</Link></Button>
      </div>
      {!data?.length ? <p className="text-muted">No listings yet.</p> : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {data.map((l) => {
            const daysLeft = l.expires_at ? Math.ceil((new Date(l.expires_at).getTime() - Date.now()) / 864e5) : null;
            return (
              <li key={l.id}>
                <Link href={`/dashboard/listings/${l.id}/edit`} className="flex flex-col gap-1 p-4 hover:bg-surface sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">{l.title}</span>
                  <span className="flex flex-wrap items-center gap-x-4 text-sm text-muted">
                    <span>{formatKes(l.rent)}</span>
                    <span>{l.units_available} of {l.units_total} units</span>
                    {l.status === "active" && daysLeft !== null && <span>Expires in {daysLeft} days</span>}
                    <span className="rounded-md border border-border-strong px-2 py-0.5 font-medium text-foreground">{STATUS_LABEL[l.status as ListingStatus]}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
