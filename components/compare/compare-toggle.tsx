"use client";

import { useEffect, useState } from "react";
import { Check, GitCompareArrows } from "lucide-react";
import { MAX_COMPARE, getCompare, setCompare } from "@/lib/compare";
import { cn } from "@/lib/utils";

/** Adds a house to the comparison (up to 4). The list lives in this browser. */
export function CompareToggle({ slug, title }: { slug: string; title: string }) {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => { const sync = () => setList(getCompare()); sync(); window.addEventListener("erent:compare", sync); window.addEventListener("storage", sync); return () => { window.removeEventListener("erent:compare", sync); window.removeEventListener("storage", sync); }; }, []);
  const on = list.includes(slug); const full = !on && list.length >= MAX_COMPARE;
  return (
    <button type="button" aria-pressed={on} disabled={full} title={full ? `You can compare up to ${MAX_COMPARE} houses` : undefined}
      onClick={() => setCompare(on ? list.filter((s) => s !== slug) : [...list, slug])}
      className={cn("inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors disabled:opacity-40", on ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground")}>
      {on ? <Check className="size-4" aria-hidden /> : <GitCompareArrows className="size-4" aria-hidden />}{on ? "Added to compare" : "Compare"}<span className="sr-only"> {title}</span>
    </button>
  );
}
