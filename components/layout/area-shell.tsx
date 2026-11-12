"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Building2, ClipboardList, HeartHandshake, Home, Inbox, LayoutDashboard, MessageCircle, PanelLeftClose, PanelLeftOpen, PlusCircle, ShieldAlert, Flag, Wrench, Users, type LucideIcon } from "lucide-react";
import { createSpring } from "@/lib/motion";
import { useSession } from "./session-provider";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard, listings: Home, add: PlusCircle, requests: Inbox, chats: MessageCircle, verify: BadgeCheck, team: Users, org: Building2,
  verifications: BadgeCheck, moderation: ShieldAlert, reports: Flag, sanctions: HeartHandshake, health: Wrench, tasks: ClipboardList,
};
export type AreaItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number; chatsBadge?: boolean; exact?: boolean };

const OPEN = 248, CLOSED = 76;

/** Side menu for the dashboard and admin. Full labels or an icon strip: the width is a spring, and your choice is remembered. */
export function AreaShell({ items, children }: { items: AreaItem[]; children: React.ReactNode }) {
  const path = usePathname();
  const s = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const aside = useRef<HTMLElement>(null);
  const spring = useRef<ReturnType<typeof createSpring> | null>(null);

  useEffect(() => {
    let startClosed = false;
    try { startClosed = localStorage.getItem("erent-sidebar") === "closed"; } catch {}
    spring.current = createSpring(startClosed ? CLOSED : OPEN, (v) => { if (aside.current) aside.current.style.width = `${v}px`; }, { response: 0.42, dampingRatio: 0.88 });
    spring.current.set(startClosed ? CLOSED : OPEN);
    setCollapsed(startClosed);
    return () => spring.current?.stop();
  }, []);

  function toggle() {
    const next = !collapsed; setCollapsed(next);
    spring.current?.to(next ? CLOSED : OPEN);
    try { localStorage.setItem("erent-sidebar", next ? "closed" : "open"); } catch {}
  }
  const isActive = (i: AreaItem) => (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/"));
  const count = (i: AreaItem) => (i.chatsBadge ? s.unread : i.badge ?? 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:flex md:gap-6">
      <nav aria-label="Sections" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
        {items.map((i) => { const Icon = ICONS[i.icon]; const c = count(i); return (
          <Link key={i.href} href={i.href} aria-current={isActive(i) ? "page" : undefined}
            className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium", isActive(i) ? "border-transparent bg-surface-2 font-semibold" : "border-border text-muted")}>
            <Icon className="size-4" aria-hidden />{i.label}{c > 0 && <span className="rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">{c}</span>}
          </Link>); })}
      </nav>

      <aside ref={aside} style={{ width: OPEN }} className="sticky top-20 hidden h-fit shrink-0 overflow-hidden rounded-[24px] border border-border bg-surface p-2.5 md:block">
        <button type="button" onClick={toggle} aria-label={collapsed ? "Expand menu" : "Collapse menu"} aria-expanded={!collapsed}
          className="mb-1 flex size-11 items-center justify-center rounded-[14px] text-muted transition-colors hover:bg-surface-2 hover:text-foreground">
          {collapsed ? <PanelLeftOpen className="size-5" aria-hidden /> : <PanelLeftClose className="size-5" aria-hidden />}
        </button>
        <ul className="space-y-1">
          {items.map((i) => { const Icon = ICONS[i.icon]; const on = isActive(i); const c = count(i); return (
            <li key={i.href}>
              <Link href={i.href} aria-current={on ? "page" : undefined} title={collapsed ? i.label : undefined}
                className={cn("relative flex h-11 items-center gap-3 rounded-[14px] px-3 text-[15px] transition-colors", on ? "bg-surface-2 font-semibold" : "text-muted hover:bg-surface-2 hover:text-foreground")}>
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className={cn("whitespace-nowrap transition-opacity duration-150", collapsed && "opacity-0")}>{i.label}</span>
                {c > 0 && (collapsed
                  ? <span className="absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"><span className="sr-only">{c} waiting</span><span aria-hidden>{c}</span></span>
                  : <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground"><span className="sr-only">{c} waiting </span><span aria-hidden>{c}</span></span>)}
              </Link>
            </li>); })}
        </ul>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
