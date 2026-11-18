"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CheckCheck, MessageCircle, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Conv = {
  id: string; listing_title: string; my_role: string; other_name: string; last_message_at: string; last_preview: string | null; unread: number;
  blocked: boolean; other_avatar: string | null; last_from_me: boolean | null; last_read: boolean | null;
};

/** Time like WhatsApp: the hour today, "Yesterday", the weekday this week, otherwise the date. */
function listTime(iso: string) {
  const d = new Date(iso); const now = new Date();
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 864e5);
  if (days <= 0) return d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString("en-KE", { weekday: "long" });
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

export function ConversationList() {
  const supabase = useMemo(() => createClient(), []);
  const path = usePathname();
  const activeId = path.match(/^\/chats\/([^/]+)/)?.[1];
  const [rows, setRows] = useState<Conv[] | null>(null);
  const [q, setQ] = useState("");
  const [onlyUnread, setOnlyUnread] = useState(false);

  const load = useCallback(() => {
    supabase.rpc("my_conversations").then(({ data, error }) => setRows(error ? [] : ((data ?? []) as Conv[])));
  }, [supabase]);

  useEffect(() => {
    load();
    let timer: ReturnType<typeof setTimeout>;
    const soon = () => { clearTimeout(timer); timer = setTimeout(load, 250); };
    const channel = supabase.channel("chat-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, soon)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, soon)
      .subscribe();
    window.addEventListener("focus", soon);
    window.addEventListener("erent:unread-changed", soon);
    return () => { clearTimeout(timer); window.removeEventListener("focus", soon); window.removeEventListener("erent:unread-changed", soon); supabase.removeChannel(channel); };
  }, [supabase, load]);

  const shown = (rows ?? []).filter((r) => (!onlyUnread || r.unread > 0) && (!q || `${r.other_name} ${r.listing_title}`.toLowerCase().includes(q.toLowerCase())));
  const totalUnread = (rows ?? []).filter((r) => r.unread > 0).length;
  const chip = "inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 px-4 pb-3 pt-4">
        <h1 className="text-[28px] leading-none">Chats</h1>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="chat-search" className="sr-only">Search chats</label>
          <input id="chat-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or house" className="min-h-11 w-full rounded-full border border-border-strong bg-surface pl-11 pr-4 text-base placeholder:text-muted" />
        </div>
        <div className="flex gap-2" role="group" aria-label="Filter chats">
          <button type="button" aria-pressed={!onlyUnread} onClick={() => setOnlyUnread(false)} className={cn(chip, !onlyUnread ? "border-transparent bg-primary text-primary-foreground shadow-[var(--shadow-primary)]" : "border-border-strong bg-surface-2 text-muted hover:text-foreground")}>All</button>
          <button type="button" aria-pressed={onlyUnread} onClick={() => setOnlyUnread(true)} className={cn(chip, onlyUnread ? "border-transparent bg-primary text-primary-foreground shadow-[var(--shadow-primary)]" : "border-border-strong bg-surface-2 text-muted hover:text-foreground")}>Unread{totalUnread > 0 ? ` ${totalUnread}` : ""}</button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-28 md:pb-4">
        {rows === null ? (
          <ul aria-hidden className="space-y-1 px-4">{[0, 1, 2, 3].map((i) => <li key={i} className="flex items-center gap-3 py-3"><div className="skeleton size-[52px] rounded-full" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-1/2 rounded" /><div className="skeleton h-3 w-3/4 rounded" /></div></li>)}</ul>
        ) : shown.length === 0 ? (
          <div className="px-6 py-14 text-center text-muted">
            <MessageCircle className="mx-auto mb-3 size-10" aria-hidden />
            <p className="font-medium text-foreground">{rows.length === 0 ? "No chats yet" : "No chats match"}</p>
            <p className="mt-1 text-sm">{rows.length === 0 ? "Open a house and choose Message the landlord." : "Try a different name or clear the filter."}</p>
          </div>
        ) : (
          <ul>
            {shown.map((c) => (
              <li key={c.id}>
                <Link href={`/chats/${c.id}`} aria-current={activeId === c.id ? "page" : undefined}
                  className={cn("flex items-center gap-3 border-b border-border/60 px-4 py-3 transition-colors hover:bg-surface-2 active:bg-surface-2", activeId === c.id && "bg-surface-2")}>
                  <Avatar name={c.other_name} path={c.other_avatar} className="size-[52px] text-base" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-[16px]", c.unread > 0 ? "font-semibold" : "font-medium")}>{c.other_name || "Someone"}</span>
                      <span className={cn("shrink-0 text-xs", c.unread > 0 ? "font-semibold text-accent" : "text-muted")}>{listTime(c.last_message_at)}</span>
                    </span>
                    <span className="block truncate text-[13px] text-muted">{c.listing_title}</span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className={cn("flex min-w-0 items-center gap-1 text-sm", c.unread > 0 ? "font-medium text-foreground" : "text-muted")}>
                        {c.last_from_me && !c.blocked && (c.last_read ? <CheckCheck className="size-4 shrink-0 text-[var(--tick-read)]" aria-label="Read" /> : <Check className="size-4 shrink-0" aria-label="Sent" />)}
                        <span className="truncate">{c.blocked ? "Blocked" : c.last_preview ?? "No messages yet"}</span>
                      </span>
                      {c.unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground"><span className="sr-only">Unread messages: </span>{c.unread > 99 ? "99+" : c.unread}</span>}
                    </span>
                  </span>
                </Link>
              </li>))}
          </ul>
        )}
      </div>
    </div>
  );
}
