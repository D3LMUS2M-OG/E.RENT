"use client";

import Link from "next/link";
import { useState } from "react";
import { COUNTY_POINTS } from "@/lib/county-points";
import { COUNTIES } from "@/lib/counties";
import { cn } from "@/lib/utils";

const W = 520, H = 620, LAT0 = 5.1, LAT1 = -4.8, LNG0 = 33.7, LNG1 = 42.1;
const nameOf = (slug: string) => COUNTIES.find((c) => c.slug === slug)?.name ?? slug;
// Equal-area enough for a country this size: longitude is shrunk slightly toward the equator
const project = (lat: number, lng: number) => ({ x: 24 + ((lng - LNG0) / (LNG1 - LNG0)) * (W - 48), y: 24 + ((LAT0 - lat) / (LAT0 - LAT1)) * (H - 48) });

/** Every county as one dot at its real position. Hover or focus a dot to name it, click to see its houses. */
export function CountyMap({ className }: { className?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const pts = COUNTY_POINTS.map(([slug, lat, lng]) => ({ slug, ...project(lat, lng) }));
  const a = pts.find((p) => p.slug === active);
  return (
    <div className={cn("relative", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Map of Kenya with one dot for each of the 47 counties" className="mx-auto h-auto w-full max-w-md">
        {pts.map((p, i) => (
          <Link key={p.slug} href={`/houses-for-rent/${p.slug}`} aria-label={nameOf(p.slug)} onMouseEnter={() => setActive(p.slug)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(p.slug)} onBlur={() => setActive(null)}>
            <circle cx={p.x} cy={p.y} r={22} fill="transparent" />
            <circle cx={p.x} cy={p.y} r={active === p.slug ? 12 : 7.5} className={cn("transition-[r,fill] duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]", active === p.slug ? "fill-[var(--primary)]" : "fill-[var(--foreground)]/55")}
              style={{ animation: `fade 600ms var(--ease-out) ${i * 22}ms both` }} />
          </Link>
        ))}
        {a && (
          <g pointerEvents="none">
            <circle cx={a.x} cy={a.y} r={12} fill="none" stroke="var(--primary)" strokeWidth={2} style={{ transformOrigin: `${a.x}px ${a.y}px`, animation: "ring 1200ms var(--ease-out) infinite" }} />
          </g>)}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center" aria-live="polite">
        <span className={cn("glass glass-frost glass-pill px-4 py-2 text-sm font-semibold transition-[opacity,transform] duration-300", active ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>{active ? nameOf(active) : "\u00a0"}</span>
      </div>
    </div>
  );
}
