"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useDismiss } from "@/components/ui/popover-menu";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Item = { id: string; title: string; body: string; url: string | null; created_at: string; read_at: string | null };

function ago(d: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (m < 1) return "now"; if (m < 60) return `${m} min`; if (m < 1440) return `${Math.round(m / 60)} h`; return `${Math.round(m / 1440)} d`;
}

/** Bell with an unread count and the latest notifications. Opening it marks them as read. */
export function NotificationBell() {
  const supabase = useRef(createClient()).current;
  const path = usePathname();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);

  const count = useCallback(async () => {
    const { count: c } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    setUnread(c ?? 0);
  }, [supabase]);
  useEffect(() => { count(); const t = setInterval(count, 45_000); return () => clearInterval(t); }, [count, path]);

  async function toggle() {
    const next = !open; setOpen(next);
    if (!next) return;
    const { data } = await supabase.from("notifications").select("id, title, body, url, created_at, read_at").order("created_at", { ascending: false }).limit(15);
    setItems((data ?? []) as Item[]);
    if (unread > 0) { await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null); setUnread(0); }
  }

  return (
    <div ref={root} className="relative">
      <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={toggle} aria-label={unread > 0 ? `Notifications, ${unread} new` : "Notifications"}
        className="relative inline-flex size-11 items-center justify-center rounded-full transition-[transform,background-color] duration-200 hover:bg-foreground/10 active:scale-90">
        <Bell className="size-5" aria-hidden />
        {unread > 0 && <span aria-hidden className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className="glass-solid motion-pop absolute right-[-3.5rem] z-50 mt-3 w-[min(22rem,calc(100vw-1.5rem))] rounded-[24px] p-2 sm:right-0">
          <p className="px-3 pb-1 pt-2 text-sm font-semibold">Notifications</p>
          {items.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted">Nothing yet. We will tell you about requests, rentals, reviews and verification here.</p> : (
            <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}><Link href={n.url ?? "/account/notifications"} onClick={close} className="flex gap-3 rounded-[16px] px-3 py-2.5 transition-colors hover:bg-foreground/10">
                  <span aria-hidden className={cn("mt-2 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} />
                  <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold leading-snug">{n.title}</span>{n.body && <span className="line-clamp-2 block text-sm text-muted">{n.body}</span>}</span>
                  <span className="shrink-0 pt-0.5 text-xs text-muted">{ago(n.created_at)}</span></Link></li>))}
            </ul>)}
          <Link href="/account/notifications" onClick={close} className="mt-1 flex min-h-11 items-center justify-center rounded-[16px] text-sm font-semibold text-link hover:bg-foreground/10">See all</Link>
        </div>)}
    </div>
  );
}
