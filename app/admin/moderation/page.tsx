import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { TakedownForm } from "@/components/listings/takedown-form";
import { formatKes } from "@/lib/utils";
import { dismissFlag } from "./actions";

export const metadata = { title: "Moderation" };

const KIND: Record<string, string> = {
  duplicate_photo: "Photo matches another landlord's listing", duplicate_location: "Same pin, rent and bedrooms as another listing",
  photo_review: "Photo needs a check", report: "Reported by a user",
};

export default async function Moderation() {
  const supabase = await createClient();
  const [flags, recent, down] = await Promise.all([
    supabase.from("listing_flags").select("id, kind, detail, created_at, listing:listings(id, slug, title, rent, status, owner_id)").eq("status", "open").order("created_at", { ascending: false }),
    supabase.from("listings").select("id, slug, title, rent, status, published_at").eq("status", "active").order("published_at", { ascending: false }).limit(20),
    supabase.from("listings").select("id, slug, title, takedown_reason").eq("status", "taken_down").limit(20),
  ]);
  type L = { id: string; slug: string; title: string; rent: number; status: string };

  return (
    <div className="space-y-12">
      <h1 className="text-3xl font-semibold tracking-tight">Moderation</h1>
      <p className="max-w-2xl text-sm text-muted">Listings go live first and are checked afterwards. Check photos for faces, people, phone numbers and personal documents.</p>

      <section aria-labelledby="flags" className="space-y-4">
        <h2 id="flags" className="text-xl font-semibold">Open flags ({flags.data?.length ?? 0})</h2>
        {!flags.data?.length && <p className="text-muted">Nothing flagged.</p>}
        <ul className="space-y-3">
          {flags.data?.map((f) => { const l = f.listing as unknown as L; return (
            <li key={f.id} className="space-y-3 rounded-lg border border-border p-4">
              <p className="font-medium">{KIND[f.kind] ?? f.kind}</p>
              {f.kind === "report" && <p className="text-sm">{String((f.detail as { reason?: string }).reason ?? "").replace("_", " ")}{(f.detail as { details?: string }).details ? `: ${(f.detail as { details?: string }).details}` : ""}</p>}
              <p className="text-sm"><Link className="underline underline-offset-4" href={`/listing/${l.slug}`}>{l.title}</Link> · {formatKes(l.rent)} · {l.status}</p>
              <div className="flex flex-wrap items-center gap-3">
                <TakedownForm listingId={l.id} takenDown={l.status === "taken_down"} />
                <form action={dismissFlag.bind(null, f.id, l.id)}><Button type="submit" variant="ghost">Dismiss flag</Button></form>
              </div>
            </li>); })}
        </ul>
      </section>

      <section aria-labelledby="recent" className="space-y-4">
        <h2 id="recent" className="text-xl font-semibold">Newest live listings</h2>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {recent.data?.map((l) => (
            <li key={l.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
              <span><Link className="font-medium underline-offset-4 hover:underline" href={`/listing/${l.slug}`}>{l.title}</Link><span className="ml-2 text-sm text-muted">{formatKes(l.rent)}</span></span>
              <TakedownForm listingId={l.id} takenDown={false} />
            </li>))}
          {!recent.data?.length && <li className="p-4 text-muted">No live listings yet.</li>}
        </ul>
      </section>

      {!!down.data?.length && (
        <section aria-labelledby="down" className="space-y-4">
          <h2 id="down" className="text-xl font-semibold">Taken down</h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {down.data.map((l) => (
              <li key={l.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                <span><span className="font-medium">{l.title}</span><span className="block text-sm text-muted">{l.takedown_reason}</span></span>
                <TakedownForm listingId={l.id} takenDown />
              </li>))}
          </ul>
        </section>
      )}
    </div>
  );
}
