import { notFound } from "next/navigation";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChatRoom, type Msg, type Overview } from "@/components/chat/chat-room";
import { ContactPanel, type ContactState } from "@/components/requests/contact-panel";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getAccess(`/chats/${id}`);
  const supabase = await createClient();
  const [{ data: ov }, { data: latest }, { data: cs }] = await Promise.all([
    supabase.rpc("chat_overview", { p_id: id }),
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.rpc("chat_contact_state", { p_conv: id }),
  ]);
  const o = (ov as Overview[] | null)?.[0];
  if (!o) notFound();
  const state = (cs as (ContactState & { available: boolean })[] | null)?.[0];

  return (
    <ChatRoom o={o} me={a.userId} initial={[...((latest ?? []) as Msg[])].reverse()}>
      {state?.available
        ? <ContactPanel c={state} id={id} source="chat" />
        : <p className="text-sm text-muted">Sharing phone numbers opens once the landlord side has replied. Numbers stay hidden until the other person approves.</p>}
    </ChatRoom>
  );
}
