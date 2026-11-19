"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { GitCompareArrows, X } from "lucide-react";
import { getCompare, setCompare } from "@/lib/compare";

/** Floating pill that appears once you add a house: open the comparison or clear it. */
export function CompareBar() {
  const [list, setList] = useState<string[]>([]); const path = usePathname();
  useEffect(() => { const sync = () => setList(getCompare()); sync(); window.addEventListener("erent:compare", sync); window.addEventListener("storage", sync); return () => { window.removeEventListener("erent:compare", sync); window.removeEventListener("storage", sync); }; }, []);
  if (list.length === 0 || path.startsWith("/compare") || /^\/(sign-in|sign-up|phone|onboarding|chats)/.test(path)) return null;
  return (
    <div className="motion-rise fixed inset-x-0 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-3 md:bottom-6">
      <div className="glass-solid flex items-center gap-1 rounded-full p-1.5 pl-2">
        <Link href={`/compare?s=${encodeURIComponent(list.join(","))}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"><GitCompareArrows className="size-4" aria-hidden />Compare {list.length} {list.length === 1 ? "house" : "houses"}</Link>
        <button type="button" onClick={() => setCompare([])} aria-label="Clear comparison" className="inline-flex size-11 items-center justify-center rounded-full hover:bg-foreground/10"><X className="size-5" aria-hidden /></button>
      </div>
    </div>
  );
}
