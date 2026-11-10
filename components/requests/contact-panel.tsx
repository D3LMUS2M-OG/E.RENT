import Link from "next/link";
import { Phone } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { setContactShare } from "@/app/requests/actions";
import { setChatContactShare } from "@/app/chats/actions";
import { whatsappLink } from "@/lib/phone";

export type ContactState = {
  request_id?: string; counterpart_name: string; theirs_status: string | null; their_phone: string | null;
  mine_status: string | null; my_phone_set: boolean;
};

/** Phone numbers are hidden by default. Each person decides whether the other may see theirs. */
export function ContactPanel({ c, id, source }: { c: ContactState; id: string; source: "request" | "chat" }) {
  const set = source === "chat" ? setChatContactShare : setContactShare;
  const first = (c.counterpart_name || "They").split(" ")[0];
  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <p className="flex items-center gap-2 text-sm font-medium"><Phone className="size-4" aria-hidden />Phone numbers</p>

      <div className="space-y-1">
        {c.theirs_status === "approved" && c.their_phone ? (
          <p className="text-sm">{first}&rsquo;s number: <span className="font-medium">{c.their_phone}</span>{" "}
            <a className="underline underline-offset-4" href={`tel:${c.their_phone}`}>Call</a>{" · "}
            <a className="underline underline-offset-4" href={whatsappLink(c.their_phone)} target="_blank" rel="noopener noreferrer">WhatsApp</a></p>
        ) : c.theirs_status === "approved" ? (
          <p className="text-sm text-muted">{first} agreed to share but has no number saved yet.</p>
        ) : c.theirs_status === "pending" ? (
          <p className="text-sm text-muted">You asked for {first}&rsquo;s number. Waiting for an answer.</p>
        ) : c.theirs_status === "declined" ? (
          <p className="text-sm text-muted">{first} chose not to share a number. Keep talking in E.Rent.</p>
        ) : c.theirs_status === "revoked" ? (
          <p className="text-sm text-muted">{first} stopped sharing their number.</p>
        ) : (
          <ActionButton action={set.bind(null, id, "ask")} variant="secondary">Ask for {first}&rsquo;s number</ActionButton>
        )}
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        {!c.my_phone_set && (c.mine_status === "pending" || !c.mine_status) ? (
          <p className="text-sm text-muted">{c.mine_status === "pending" ? `${first} asked for your number. ` : ""}<Link className="underline underline-offset-4" href="/account#phone">Add your phone number</Link> to be able to share it.</p>
        ) : c.mine_status === "pending" ? (
          <>
            <p className="text-sm font-medium">{first} asked for your number.</p>
            <div className="flex flex-wrap gap-2">
              <ActionButton action={set.bind(null, id, "approve")}>Share my number</ActionButton>
              <ActionButton action={set.bind(null, id, "decline")} variant="secondary">Do not share</ActionButton>
            </div>
          </>
        ) : c.mine_status === "approved" ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm">{first} can see your number.</span>
            <ActionButton action={set.bind(null, id, "revoke")} variant="ghost">Stop sharing</ActionButton>
          </div>
        ) : (
          <ActionButton action={set.bind(null, id, "share")} variant="ghost">{c.mine_status ? "Share my number again" : "Share my number with " + first}</ActionButton>
        )}
      </div>
    </div>
  );
}
