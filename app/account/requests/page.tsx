import Link from "next/link";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionButton } from "@/components/ui/action-button";
import { CancelRentalForm } from "@/components/requests/cancel-rental-form";
import { ContactPanel, type ContactState } from "@/components/requests/contact-panel";
import { cancelRequest, markViewed, respondRental } from "@/app/requests/actions";
import { formatKes } from "@/lib/utils";

export const metadata = { title: "My requests" };

type Row = { id: string; listing_title: string; listing_slug: string; rent: number; kind: "view" | "apply"; message: string; preferred_date: string | null;
  occupants: number; status: string; decision_note: string | null; created_at: string; rental_id: string | null; rental_status: string | null; tour_done: boolean; cancel_reason: string | null; cancelled_by_me: boolean | null };
const STATUS: Record<string, string> = { pending: "Waiting for a reply", accepted: "Accepted", declined: "Declined", cancelled: "Cancelled" };

export default async function MyRequests() {
  await getAccess("/account/requests");
  const supabase = await createClient();
  const [{ data }, { data: cs }] = await Promise.all([supabase.rpc("my_requests"), supabase.rpc("contact_states")]);
  const contacts = new Map(((cs ?? []) as ContactState[]).map((c) => [c.request_id, c]));
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">My requests</h1>
      {rows.length === 0 && <p className="text-muted">You have not sent any requests. Open a house and choose Request to view.</p>}
      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.id} className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link className="font-medium underline-offset-4 hover:underline" href={`/listing/${r.listing_slug}`}>{r.listing_title}</Link>
                <p className="text-sm text-muted">{r.kind === "view" ? "Viewing request" : "Application"} · {formatKes(r.rent)} / month · {new Date(r.created_at).toLocaleDateString("en-KE")}</p>
              </div>
              <span className="rounded-md border border-border-strong px-2 py-0.5 text-sm font-medium">{STATUS[r.status]}</span>
            </div>
            {r.decision_note && <p className="text-sm">Landlord says: {r.decision_note}</p>}

            {r.rental_status === "proposed" && (
              <div className="space-y-2 rounded-md border-2 border-border-strong p-3">
                <p className="text-sm font-medium">The landlord confirmed that you rented this house. Accept only if this is correct and you have agreed the terms.</p>
                <div className="flex flex-wrap gap-2">
                  <ActionButton action={respondRental.bind(null, r.rental_id!, true)} confirmText="Confirm that you rented this house?">Accept rental</ActionButton>
                  <ActionButton action={respondRental.bind(null, r.rental_id!, false)} variant="secondary">This is wrong</ActionButton>
                </div>
              </div>
            )}
            {r.rental_status === "confirmed" && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Rental confirmed. You can review this landlord once reviews open.</p>
                <CancelRentalForm rentalId={r.rental_id!} />
              </div>)}
            {r.rental_status === "cancelled" && (
              <p className="text-sm">{r.cancelled_by_me ? "You cancelled" : "The landlord cancelled"} the rental{r.cancel_reason ? `: ${r.cancel_reason}` : "."}</p>)}
            {r.status === "accepted" && contacts.get(r.id) && <ContactPanel c={contacts.get(r.id)!} id={r.id} source="request" />}

            <div className="flex flex-wrap gap-2">
              {r.kind === "view" && r.status === "accepted" && !r.tour_done && (
                <ActionButton action={markViewed.bind(null, r.id)} variant="secondary">I have viewed this house</ActionButton>
              )}
              {r.kind === "view" && r.tour_done && <span className="text-sm text-muted">Viewing recorded</span>}
              {(r.status === "pending" || r.status === "accepted") && (!r.rental_status || r.rental_status === "cancelled") && (
                <ActionButton action={cancelRequest.bind(null, r.id)} variant="ghost" confirmText="Cancel this request?">Cancel request</ActionButton>
              )}
            </div>
          </li>))}
      </ul>
    </div>
  );
}
