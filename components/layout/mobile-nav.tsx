"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { Heart, House, LayoutDashboard, LogIn, MapPinned, MessageCircle, Search, UserRound, type LucideIcon } from "lucide-react";
import { createSpring } from "@/lib/motion";
import { useSession } from "./session-provider";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean; badge?: number };

/** Floating glass bar. The raised circle slides between tabs on a spring (so a second tap mid-slide turns it round
 *  smoothly), and the whole bar hides when you scroll down and returns when you scroll up. */
export function MobileNav() {
  const s = useSession();
  const path = usePathname();
  const landlordLike = s.roles.some((r) => ["landlord", "agent", "organization"].includes(r));

  const tabs: Tab[] = useMemo(() => {
    const home: Tab = { href: "/", label: "Home", icon: House, match: (p) => p === "/" };
    const search: Tab = { href: "/search", label: "Search", icon: Search, match: (p) => /^\/(search|listing|houses-for-rent)/.test(p) };
    if (s.status !== "in") return [home, search, { href: "/counties", label: "Counties", icon: MapPinned, match: (p) => p.startsWith("/counties") }, { href: "/sign-in", label: "Sign in", icon: LogIn, match: (p) => /^\/sign-(in|up)/.test(p) }];
    return [
      home, search,
      landlordLike ? { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => /^\/(dashboard|org)/.test(p) } : { href: "/saved", label: "Saved", icon: Heart, match: (p: string) => p.startsWith("/saved") },
      { href: "/chats", label: "Chats", icon: MessageCircle, match: (p: string) => p.startsWith("/chats"), badge: s.unread },
      { href: "/account", label: "Account", icon: UserRound, match: (p: string) => p.startsWith("/account") },
    ];
  }, [s.status, s.unread, landlordLike]);

  const active = tabs.findIndex((t) => t.match(path));
  const hiddenHere = /^\/chats\/[^/]+/.test(path);   // the message box sits at the bottom of a chat

  const bar = useRef<HTMLElement>(null);
  const slider = useRef<HTMLDivElement>(null);
  const xSpring = useRef<ReturnType<typeof createSpring> | null>(null);
  const ySpring = useRef<ReturnType<typeof createSpring> | null>(null);
  const lastIndex = useRef(0);

  useEffect(() => {
    xSpring.current = createSpring(0, (v) => { if (slider.current) slider.current.style.transform = `translateX(${v * 100}%)`; }, { response: 0.4, dampingRatio: 0.82, restDelta: 0.001, restSpeed: 0.01 });
    ySpring.current = createSpring(0, (v) => { if (bar.current) bar.current.style.transform = `translateY(${v}px)`; }, { response: 0.45, dampingRatio: 1 });
    return () => { xSpring.current?.stop(); ySpring.current?.stop(); };
  }, []);

  useEffect(() => {
    if (active >= 0) { lastIndex.current = active; xSpring.current?.to(active); }
    else xSpring.current?.to(Math.min(lastIndex.current, tabs.length - 1));
  }, [active, tabs.length]);

  useEffect(() => {
    let last = window.scrollY; let hidden = false;
    const show = () => { if (hidden) { hidden = false; ySpring.current?.to(0); } };
    const onScroll = () => {
      const y = window.scrollY; const d = y - last;
      if (Math.abs(d) < 8) return;
      const nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 40;
      if (d > 0 && y > 80 && !hidden) { hidden = true; ySpring.current?.to(130); }
      else if ((d < 0 || nearBottom) && hidden) show();
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    bar.current?.addEventListener("focusin", show);
    const el = bar.current;
    return () => { window.removeEventListener("scroll", onScroll); el?.removeEventListener("focusin", show); };
  }, []);

  if (hiddenHere) return null;
  const n = tabs.length;
  const Current = tabs[active >= 0 ? active : Math.min(lastIndex.current, n - 1)];

  return (
    <nav ref={bar} aria-label="Main" className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 md:hidden">
      <div className="glass relative h-[68px] rounded-[30px] shadow-[0_12px_40px_rgba(0,0,0,.4)]">
        <div ref={slider} aria-hidden className="pointer-events-none absolute left-0 top-0 h-full will-change-transform" style={{ width: `${100 / n}%` }}>
          <div className={cn("absolute -top-6 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground ring-[5px] ring-background transition-opacity duration-200", active < 0 && "opacity-0")}>
            <Current.icon className="size-6" />
            {Current.badge ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[11px] font-bold text-background">{Current.badge > 99 ? "99+" : Current.badge}</span> : null}
          </div>
        </div>
        <ul className="relative grid h-full" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {tabs.map((t, i) => {
            const on = i === active;
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={on ? "page" : undefined} className="relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] active:scale-95 transition-transform duration-150">
                  <span className={cn("relative transition-all duration-200 ease-[var(--ease-out)]", on ? "scale-75 opacity-0" : "text-muted")}>
                    <t.icon className="size-6" aria-hidden />
                    {t.badge ? <span className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground"><span className="sr-only">Unread from </span>{t.badge > 99 ? "99+" : t.badge}</span> : null}
                  </span>
                  <span className={cn("transition-all duration-200 ease-[var(--ease-out)]", on ? "translate-y-2 font-semibold text-foreground" : "text-muted")}>{t.label}</span>
                </Link>
              </li>);
          })}
        </ul>
      </div>
    </nav>
  );
}
