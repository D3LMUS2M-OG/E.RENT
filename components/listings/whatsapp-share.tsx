"use client";

import { usePathname } from "next/navigation";
import { Share2 } from "lucide-react";

/** Floating share button (SCH-9). Opens WhatsApp with the current page. */
export function WhatsAppShare({ title }: { title?: string }) {
  const path = usePathname();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const text = `${title ?? "A house on E.Rent"} ${base}${path}`;
  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(text)}`}
      target="_blank" rel="noopener noreferrer"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-95"
    >
      <Share2 className="size-4" aria-hidden />Share on WhatsApp
    </a>
  );
}
