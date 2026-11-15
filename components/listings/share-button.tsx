"use client";

import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Opens the phone's share sheet. Computers without one get a WhatsApp link. */
export function ShareButton({ title, className }: { title: string; className?: string }) {
  async function share() {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ title, url }); } catch {} return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`, "_blank", "noopener,noreferrer");
  }
  return (
    <button type="button" onClick={share} aria-label="Share this house"
      className={cn("inline-flex size-11 items-center justify-center rounded-full border border-border-strong bg-background/85 text-foreground shadow-[var(--shadow-btn)] backdrop-blur transition-[transform,background-color] duration-150 hover:bg-surface-2 active:translate-y-px active:scale-95", className)}>
      <Share2 className="size-5" aria-hidden />
    </button>
  );
}
