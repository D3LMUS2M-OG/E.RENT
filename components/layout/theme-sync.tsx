"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { applyTheme, getThemeChoice } from "@/lib/theme";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Keeps the saved theme on the page. Some page changes (and the chat screen after a reload) can rewrite the <html> element and
 *  drop the theme, so this re-applies it after every navigation and puts it back if anything removes it. */
export function ThemeSync() {
  const path = usePathname();
  useIsoLayoutEffect(() => { applyTheme(); }, [path]);
  useEffect(() => {
    const root = document.documentElement;
    const restore = () => { const c = getThemeChoice(); const want = c === "system" ? undefined : c; if (root.dataset.theme !== want) applyTheme(c); };
    const mo = new MutationObserver(restore);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = matchMedia("(prefers-color-scheme: light)");
    const onSystem = () => applyTheme();
    mq.addEventListener("change", onSystem);
    window.addEventListener("storage", restore);
    window.addEventListener("pageshow", restore);
    document.addEventListener("visibilitychange", restore);
    return () => { mo.disconnect(); mq.removeEventListener("change", onSystem); window.removeEventListener("storage", restore); window.removeEventListener("pageshow", restore); document.removeEventListener("visibilitychange", restore); };
  }, []);
  return null;
}
