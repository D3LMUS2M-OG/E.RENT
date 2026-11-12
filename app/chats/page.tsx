import Link from "next/link";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChatsLive } from "@/components/chat/chats-live";

type Row = { id: string; listing_title: string; my_role: string; other_name: string; last_message_at: string; last_preview: string | null; unread: number; blocked: boolean; other_user_id: string };

export default async function ChatsPage() {
  await getAccess("/chats");
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_conversations");
  const rows = (data ?? []) as Row[];
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <ChatsLive />
      <h1 className="text-3xl font-semibold tracking-tight">Chats</h1>
      {rows.length === 0 ? (
        <p className="mt-4 max-w-md text-muted">No conversations yet. Open a house and choose Message the landlord. Chats are deleted after 30 days.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-[20px] border border-border bg-surface">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/chats/${c.id}`} className="flex items-start justify-between gap-3 p-4 hover:bg-surface">
                <span className="min-w-0">
                  <span className={`block ${c.unread > 0 ? "font-semibold" : "font-medium"}`}>{c.other_name || "Someone"}<span className="ml-2 text-sm font-normal text-muted">{c.my_role === "landlord" ? "as landlord" : "as tenant"}</span></span>
                  <span className="block truncate text-sm text-muted">{c.listing_title}</span>
                  <span className={`block truncate text-sm ${c.unread > 0 ? "font-medium" : ""}`}>{c.blocked ? "Blocked" : c.last_preview ?? "No messages yet"}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1 text-sm text-muted">
                  {new Date(c.last_message_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                  {c.unread > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"><span className="sr-only">Unread messages: </span>{c.unread > 99 ? "99+" : c.unread}</span>}
                </span>
              </Link>
            </li>))}
        </ul>
      )}
      <p className="mt-6 text-sm text-muted">Messages and files are deleted 30 days after they are sent. Reported conversations are kept for review.</p>
    </div>
  );
}
