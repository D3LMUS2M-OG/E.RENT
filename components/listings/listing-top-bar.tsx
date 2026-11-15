"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FavouriteButton } from "./favourite-button";
import { ShareButton } from "./share-button";
import { cn } from "@/lib/utils";

/** Phone-only top bar. Floating over the photos at first; once you scroll it turns to frosted glass and shows the title. */
export function ListingTopBar({ listingId, title }: { listingId: string; title: string }) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  useEffect(() => {
    const on = () => { setScrolled(window.scrollY > 12); setShowTitle(window.scrollY > 260); };
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const back = () => { if (window.history.length > 1) router.back(); else router.push("/search"); };

  return (
    <div className={cn("sticky top-0 z-30 flex items-center gap-2 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] transition-[background-color,border-color,backdrop-filter] duration-200 md:hidden", scrolled ? "glass border-x-0 border-t-0" : "border-b border-transparent")}>
      <button type="button" onClick={back} aria-label="Back" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-background/85 shadow-[var(--shadow-btn)] backdrop-blur transition-transform duration-150 active:translate-y-px active:scale-95"><ArrowLeft className="size-5" aria-hidden /></button>
      <p aria-hidden={!showTitle} className={cn("min-w-0 flex-1 truncate text-center text-[15px] font-semibold transition-opacity duration-200", showTitle ? "opacity-100" : "opacity-0")}>{title}</p>
      <div className="flex shrink-0 gap-2"><FavouriteButton listingId={listingId} iconOnly /><ShareButton title={title} /></div>
    </div>
  );
}
