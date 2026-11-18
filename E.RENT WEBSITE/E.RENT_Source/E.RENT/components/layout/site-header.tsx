"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { createSpring } from "@/lib/motion";
import { Logo } from "@/components/brand/logo";
import { DesktopNav } from "./desktop-nav";
import { HeaderActions } from "./header-actions";

const HIDDEN_ON = /^\/(sign-in|sign-up|forgot-password|reset-password|phone|onboarding)/;

/** Floating glass pill, centred and detached from the screen edges. It slides away when you scroll down and returns when you scroll up. */
export function SiteHeader() {
  const path = usePathname();
  const bar = useRef<HTMLElement>(null);
  const y = useRef<ReturnType<typeof createSpring> | null>(null);
  const off = HIDDEN_ON.test(path);

  useEffect(() => {
    y.current = createSpring(0, (v) => { if (bar.current) bar.current.style.transform = `translateY(${v}px)`; }, { response: 0.45, dampingRatio: 1 });
    let last = window.scrollY; let hidden = false;
    const show = () => { if (hidden) { hidden = false; y.current?.to(0); } };
    const onScroll = () => {
      const s = window.scrollY; const d = s - last;
      if (Math.abs(d) < 8) return;
      if (d > 0 && s > 90 && !hidden) { hidden = true; y.current?.to(-140); } else if (d < 0 && hidden) show();
      last = s;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const el = bar.current; el?.addEventListener("focusin", show);
    return () => { window.removeEventListener("scroll", onScroll); el?.removeEventListener("focusin", show); y.current?.stop(); };
  }, []);
  useEffect(() => { y.current?.set(0); }, [path]);

  if (off) return null;
  return (
    <header ref={bar} className="site-header fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-40 mx-auto max-w-6xl will-change-transform">
      <div className="glass glass-frost glass-pill relative flex h-16 items-center gap-1 pl-5 pr-2">
        <Logo />
        <DesktopNav />
        <HeaderActions />
      </div>
    </header>
  );
}
