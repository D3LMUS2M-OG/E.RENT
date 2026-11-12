"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const KEY = "erent-install-dismissed";
const SNOOZE_DAYS = 14;

const isStandalone = () =>
  (typeof matchMedia === "function" && (matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || matchMedia("(display-mode: minimal-ui)").matches)) ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** Asks people to install E.Rent as an app. It never shows once the app is installed or open as an app. */
export function InstallBanner() {
  const [mode, setMode] = useState<"hidden" | "prompt" | "ios">("hidden");
  const deferred = useRef<InstallEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    try { const t = Number(localStorage.getItem(KEY)); if (t && Date.now() - t < SNOOZE_DAYS * 864e5) return; } catch {}

    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const showLater = (m: "prompt" | "ios") => { clearTimeout(timer); timer = setTimeout(() => { if (!cancelled && !isStandalone()) setMode(m); }, 6000); };

    // If the app is already installed on this phone, a browser tab should not ask again
    const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> };
    const installedCheck = nav.getInstalledRelatedApps ? nav.getInstalledRelatedApps().then((a) => a.length > 0).catch(() => false) : Promise.resolve(false);

    const onPrompt = (e: Event) => { e.preventDefault(); deferred.current = e as InstallEvent; installedCheck.then((installed) => { if (!installed) showLater("prompt"); }); };
    const onInstalled = () => { setMode("hidden"); try { localStorage.setItem(KEY, String(Date.now() + 3650 * 864e5)); } catch {} };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const mq = matchMedia("(display-mode: standalone)");
    const onMode = () => { if (mq.matches) setMode("hidden"); };
    mq.addEventListener("change", onMode);
    if (isIos()) showLater("ios");   // iPhones have no install prompt: show the steps

    return () => { cancelled = true; clearTimeout(timer); window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); mq.removeEventListener("change", onMode); };
  }, []);

  function dismiss() { setMode("hidden"); try { localStorage.setItem(KEY, String(Date.now())); } catch {} }
  async function install() {
    const ev = deferred.current; if (!ev) return;
    await ev.prompt(); const { outcome } = await ev.userChoice;
    deferred.current = null; setMode("hidden");
    if (outcome === "dismissed") try { localStorage.setItem(KEY, String(Date.now())); } catch {}
  }

  if (mode === "hidden") return null;
  return (
    <aside role="dialog" aria-label="Install E.Rent" className="motion-rise glass fixed inset-x-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 rounded-[24px] p-4 shadow-[0_16px_48px_rgba(0,0,0,.45)] md:inset-x-auto md:bottom-6 md:right-6 md:w-96">
      <button type="button" onClick={dismiss} aria-label="Not now" className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2"><X className="size-5" aria-hidden /></button>
      <div className="flex gap-3 pr-8">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Download className="size-5" aria-hidden /></span>
        <div className="space-y-1">
          <p className="font-semibold">Install E.Rent on your phone</p>
          {mode === "ios" ? (
            <p className="text-sm text-muted">Tap <Share className="mx-0.5 inline size-4 align-text-bottom" aria-label="Share" /> in Safari, then <SquarePlus className="mx-0.5 inline size-4 align-text-bottom" aria-hidden /> <b className="text-foreground">Add to Home Screen</b>. It opens faster and works on weak networks.</p>
          ) : (
            <p className="text-sm text-muted">Opens faster, works on weak networks and sits on your home screen like any app.</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {mode === "prompt" && <Button onClick={install} className="flex-1">Install</Button>}
        <Button variant="secondary" onClick={dismiss} className="flex-1">Not now</Button>
      </div>
    </aside>
  );
}
