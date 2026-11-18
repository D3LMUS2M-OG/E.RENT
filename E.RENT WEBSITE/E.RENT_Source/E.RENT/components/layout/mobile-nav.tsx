"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Heart, House, LayoutDashboard, LogIn, MapPinned, MessageCircle, Search, UserRound, type LucideIcon } from "lucide-react";
import { createSpring } from "@/lib/motion";
import { useSession } from "./session-provider";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean; badge?: number };

const NO_TAB = -10;   // a position far from every tab: no pill is drawn

/** Frosted-glass bar like iOS. The active tab is an orange pill holding its icon and name. Moving between tabs morphs one pill
 *  into the next on a spring (a second tap mid-move turns round smoothly). The bar slides away when you scroll down. */
export function MobileNav() {
  const s = useSession();
  const path = usePathname();
  const landlordLike = s.roles.some((r) => ["landlord", "agent", "organization"].includes(r));

  const tabs: Tab[] = useMemo(() => {
    const home: Tab = { href: "/", label: "Home", icon: House, match: (p) => p === "/" };
    const search: Tab = { href: "/search", label: "Search", icon: Search, match: (p) => /^\/(search|houses-for-rent)/.test(p) };
    if (s.status !== "in") return [home, search, { href: "/counties", label: "Counties", icon: MapPinned, match: (p) => p.startsWith("/counties") }, { href: "/sign-in", label: "Sign in", icon: LogIn, match: (p) => /^\/sign-(in|up)/.test(p) }];
    return [
      home, search,
      landlordLike ? { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => /^\/(dashboard|org)/.test(p) } : { href: "/saved", label: "Saved", icon: Heart, match: (p: string) => p.startsWith("/saved") },
      { href: "/chats", label: "Chats", icon: MessageCircle, match: (p: string) => p.startsWith("/chats"), badge: s.unread },
      { href: "/account", label: "Account", icon: UserRound, match: (p: string) => p.startsWith("/account") },
    ];
  }, [s.status, s.unread, landlordLike]);

  const active = tabs.findIndex((t) => t.match(path));
  // Pages with their own bottom bar or full-screen design
  const hiddenHere = /^\/chats\/[^/]+/.test(path) || /^\/listing\//.test(path) || /^\/(sign-in|sign-up|forgot-password|reset-password|phone|onboarding)/.test(path);

  const bar = useRef<HTMLElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const tabEls = useRef<(HTMLAnchorElement | null)[]>([]);
  const labelEls = useRef<(HTMLSpanElement | null)[]>([]);
  const labelW = useRef<number[]>([]);
  const idxSpring = useRef<ReturnType<typeof createSpring> | null>(null);
  const ySpring = useRef<ReturnType<typeof createSpring> | null>(null);
  const prevActive = useRef<number>(NO_TAB);

  // Writes every tab's width from the spring value v (the tab position, fractional while moving)
  const paint = useCallback((v: number) => {
    const el = row.current; if (!el) return;
    const n = tabs.length; const W = el.clientWidth; if (!W) return;
    const w = tabs.map((_, i) => Math.max(0, 1 - Math.abs(i - v)));
    const extra = tabs.map((_, i) => (labelW.current[i] ?? 56) + 8);
    const used = w.reduce((a, x, i) => a + x * extra[i], 0);
    const base = Math.max(36, (W - used) / n);
    tabEls.current.forEach((a, i) => {
      if (!a) return;
      a.style.width = `${base + w[i] * extra[i]}px`;
      (a.firstElementChild as HTMLElement).style.opacity = String(Math.min(1, w[i] * 1.2));
      const lab = labelEls.current[i];
      if (lab) { lab.style.width = `${w[i] * (labelW.current[i] ?? 56)}px`; lab.style.opacity = String(Math.max(0, w[i] * 1.5 - 0.5)); lab.style.marginLeft = `${8 * w[i]}px`; }
    });
  }, [tabs]);
  const paintRef = useRef(paint);
  paintRef.current = paint;

  useEffect(() => {
    idxSpring.current = createSpring(NO_TAB, (v) => paintRef.current(v), { response: 0.42, dampingRatio: 0.8, restDelta: 0.001, restSpeed: 0.01 });
    ySpring.current = createSpring(0, (v) => { if (bar.current) bar.current.style.transform = `translateY(${v}px)`; }, { response: 0.45, dampingRatio: 1 });
    return () => { idxSpring.current?.stop(); ySpring.current?.stop(); };
  }, []);

  // Measure label widths (after fonts load) and place the pill without animating on first draw
  useEffect(() => {
    if (hiddenHere) return;
    const measure = () => {
      labelW.current = tabs.map((_, i) => labelEls.current[i]?.scrollWidth ?? 56);
      const v = active >= 0 ? active : NO_TAB;
      idxSpring.current?.set(v); prevActive.current = v; paintRef.current(v);
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    const ro = new ResizeObserver(() => paintRef.current(idxSpring.current?.value ?? NO_TAB));
    if (row.current) ro.observe(row.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length, hiddenHere, s.status]);

  // Moving between tabs: spring. From "no tab" to a tab: jump, so no pill flies across the others.
  useEffect(() => {
    if (hiddenHere) return;
    const next = active >= 0 ? active : NO_TAB;
    if (prevActive.current === NO_TAB || next === NO_TAB) idxSpring.current?.set(next); else idxSpring.current?.to(next);
    prevActive.current = next; paintRef.current(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, hiddenHere]);

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
    const el = bar.current;
    el?.addEventListener("focusin", show);
    return () => { window.removeEventListener("scroll", onScroll); el?.removeEventListener("focusin", show); };
  }, [hiddenHere]);

  // Nothing is drawn while we do not yet know whether you are signed in, so "Sign in" never flashes
  if (s.status === "loading" || hiddenHere) return null;
  const n = tabs.length;

  return (
    <nav ref={bar} aria-label="Main" className={cn("fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 will-change-transform md:hidden")}>
      <div className="glass glass-frost glass-pill p-2">
        <div ref={row} className="flex h-12 w-full items-center">
          {tabs.map((t, i) => {
            const on = i === active;
            return (
              <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} ref={(el) => { tabEls.current[i] = el; }} style={{ width: `${100 / n}%` }}
                className="relative flex h-12 shrink-0 items-center justify-center overflow-hidden rounded-full transition-transform duration-150 active:scale-95">
                <span aria-hidden className="absolute inset-0 rounded-full bg-primary shadow-[var(--shadow-primary)]" style={{ opacity: on ? 1 : 0 }} />
                <span className={cn("relative flex items-center transition-colors duration-150", on ? "text-primary-foreground" : "text-muted")}>
                  <span className="relative">
                    <t.icon className="size-[22px]" aria-hidden />
                    {t.badge ? <span className={cn("absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-bold", on ? "bg-foreground text-background" : "bg-primary text-primary-foreground")}><span className="sr-only">Unread from </span>{t.badge > 99 ? "99+" : t.badge}<span className="sr-only"> people</span></span> : null}
                  </span>
                  <span ref={(el) => { labelEls.current[i] = el; }} className="inline-block overflow-hidden whitespace-nowrap text-sm font-semibold" style={on ? undefined : { width: 0, opacity: 0 }}>{t.label}</span>
                </span>
              </Link>);
          })}
        </div>
      </div>
    </nav>
  );
}
