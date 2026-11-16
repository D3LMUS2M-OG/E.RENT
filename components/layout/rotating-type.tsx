"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HOUSE_TYPES } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const SHOW_MS = 30_000;       // how long a house type stays in the bar
const GAP_MS = 150_000;       // pause before the next one (a new type roughly every 3 minutes)

/** A house type (Bedsitter, Maisonette, 2 bedroom…) that slides into the top bar, stays a while, leaves, and is replaced
 *  by the next one a few minutes later. Replaces the fixed "Student housing" link; student housing is simply one of the types. */
export function RotatingType({ className }: { className?: string }) {
  const [i, setI] = useState(() => 0);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    let n = Math.floor(Math.random() * HOUSE_TYPES.length);
    const cycle = (first: boolean) => {
      setI(n); setVisible(true);
      t = setTimeout(() => { setVisible(false); n = (n + 1) % HOUSE_TYPES.length; t = setTimeout(() => cycle(false), GAP_MS); }, SHOW_MS);
    };
    t = setTimeout(() => cycle(true), 4000);
    return () => clearTimeout(t);
  }, []);
  const [slug, name] = HOUSE_TYPES[i];
  return (
    <span aria-live="off" className={cn("inline-grid transition-[grid-template-columns,opacity,transform] duration-700 ease-[cubic-bezier(.34,1.3,.64,1)]", visible ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] -translate-y-1 opacity-0", className)}>
      <span className="overflow-hidden">
        <Link href={`/search?type=${slug}`} tabIndex={visible ? 0 : -1} className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-accent/50 px-3.5 text-[15px] font-medium text-accent hover:bg-accent/10">{name}</Link>
      </span>
    </span>
  );
}
