import { TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ActionButton } from "@/components/ui/action-button";
import { acknowledgeNotice } from "@/app/account/actions";

type Notice = { id: string; kind: "warning" | "summons" | "suspension" | "ban"; reason: string; ends_at: string | null; created_at: string };
const TITLE = { warning: "Warning from E.Rent", summons: "You are asked to respond", suspension: "Your account is suspended", ban: "Your account is banned" } as const;

/** Moderator notices: warnings and summonses stay until acknowledged. Suspensions show while active. */
export async function Notices() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_notices");
  const notices = (data ?? []) as Notice[];
  if (!notices.length) return null;
  return (
    <section aria-label="Notices" className="mb-8 space-y-3">
      {notices.map((n) => (
        <div key={n.id} role="alert" className="space-y-2 rounded-lg border-2 border-border-strong p-4">
          <p className="flex items-center gap-2 font-semibold"><TriangleAlert className="size-5" aria-hidden />{TITLE[n.kind]}</p>
          <p className="text-sm">{n.reason}</p>
          {n.ends_at && <p className="text-sm text-muted">Until {new Date(n.ends_at).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</p>}
          {(n.kind === "warning" || n.kind === "summons") && <ActionButton action={acknowledgeNotice.bind(null, n.id)} variant="secondary">{n.kind === "summons" ? "I have read this and will respond" : "I have read this"}</ActionButton>}
        </div>))}
    </section>
  );
}
