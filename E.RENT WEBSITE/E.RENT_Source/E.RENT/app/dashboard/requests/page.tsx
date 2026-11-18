import Link from "next/link";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionButton } from "@/components/ui/action-button";
import { CancelRentalForm } from "@/components/requests/cancel-rental-form";
import { ContactPanel, type ContactState } from "@/components/requests/contact-panel";
import { RespondForm } from "@/components/requests/respond-form";
import { proposeRental, respondRental } from "@/app/requests/actions";

export const metadata = { title: "Requests" };

type Row = { id: string; listing_title: string; listing_slug: string; tenant_name: string; kind: "view" | "apply"; message: string; preferred_date: string | null;
  occupants: number; status: string; decision_note: string | null; created_at: string; rental_id: string | null; rental_status: string | null; tour_done: boolean; is_owner: boolean; cancel_reason: string | null; cancelled_by_me: boolean | null };

export default async function IncomingRequests() {
  await getAccess("/dashboard/requests");
  const supabase = await createClient();
  const [{ data }, { data: cs }] = await Promise.all([supabase.rpc("incoming_requests"), supabase.rpc("contact_states")]);
  const contacts = new Map(((cs ?? []) as ContactState[]).map((c) => [c.request_id, c]));
  const rows = (data ?? []) as Row[];
  const open = rows.filter((r) => r.status === "pending");
  const rest = rows.filter((r) => r.status !== "pending");

  const card = (r: Row) => (
    <li key={r.id} className="space-y-3 rounded-[20px] border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{r.tenant_name || "A tenant"} <span className="font-normal text-muted">· {r.kind === "view" ? "wants to view" : "applies to rent"}</span></p>
          <p className="text-sm text-muted"><Link className="underline underline-offset-4" href={`/listing/${r.listing_slug}`}>{r.listing_title}</Link> · {new Date(r.created_at).toLocaleDateString("en-KE")}</p>
        </div>
        <span className="rounded-md border border-border-strong px-2 py-0.5 text-sm font-medium capitalize">{r.status}</span>
      </div>
      <p className="text-sm">{r.occupants} {r.occupants === 1 ? "person" : "people"}{r.preferred_date && ` · prefers ${new Date(r.preferred_date).toLocaleDateString("en-KE", { day: "numeric", month: "long" })}`}</p>
      {r.message && <p className="whitespace-pre-line rounded-md bg-surface p-3 text-sm">{r.message}</p>}
      {r.status === "pending" && <RespondForm id={r.id} />}
      {r.status === "accepted" && (
        <div className="flex flex-wrap items-center gap-3">
          {r.tour_done && <span className="text-sm text-muted">Tenant marked the viewing done</span>}
          {(!r.rental_status || r.rental_status === "cancelled") && r.is_owner && (
            <ActionButton action={proposeRental.bind(null, r.id)} confirmText="Confirm that this tenant has rented the house? They must accept before it counts.">Confirm rented to this tenant</ActionButton>)}
          {(!r.rental_status || r.rental_status === "cancelled") && !r.is_owner && <span className="text-sm text-muted">Only the landlord can confirm a rental</span>}
          {r.rental_status === "proposed" && <>
            <span className="text-sm font-medium">Waiting for the tenant to accept</span>
            {r.is_owner && <ActionButton action={respondRental.bind(null, r.rental_id!, false)} variant="ghost">Cancel</ActionButton>}</>}
          {r.rental_status === "confirmed" && <>
            <span className="text-sm font-medium">Rental confirmed by both of you</span>
            {r.is_owner && <CancelRentalForm rentalId={r.rental_id!} />}</>}
          {r.rental_status === "cancelled" && <span className="text-sm">{r.cancelled_by_me ? "You cancelled" : "The tenant cancelled"} the rental{r.cancel_reason ? `: ${r.cancel_reason}` : "."}</span>}
        </div>
      )}
      {r.status === "accepted" && contacts.get(r.id) && <ContactPanel c={contacts.get(r.id)!} id={r.id} source="request" />}
      {r.decision_note && r.status !== "pending" && <p className="text-sm text-muted">Your note: {r.decision_note}</p>}
    </li>
  );

  return (
    <div className="max-w-3xl space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight">Requests</h1>
      <section aria-labelledby="open" className="space-y-4">
        <h2 id="open" className="text-xl font-semibold">Waiting for your reply ({open.length})</h2>
        {open.length === 0 ? <p className="text-muted">Nothing waiting.</p> : <ul className="space-y-4">{open.map(card)}</ul>}
      </section>
      {rest.length > 0 && <section aria-labelledby="rest" className="space-y-4"><h2 id="rest" className="text-xl font-semibold">Earlier</h2><ul className="space-y-4">{rest.map(card)}</ul></section>}
    </div>
  );
}
