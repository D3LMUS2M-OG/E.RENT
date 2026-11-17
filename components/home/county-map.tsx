"use client";

import Link from "next/link";
import { useState } from "react";
import { KENYA_COUNTY_SHAPES, KENYA_OUTLINE_PATH, MAP_H, MAP_W } from "@/lib/kenya-geo";
import { cn } from "@/lib/utils";

/** Kenya drawn from its real county boundaries. Hover, focus or tap a county to name it, click to see its houses. */
export function CountyMap({ className }: { className?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const name = KENYA_COUNTY_SHAPES.find(([s]) => s === active)?.[1];
  return (
    <div className={cn("relative", className)}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="group" aria-label="Map of Kenya: each of the 47 counties is a link" className="mx-auto h-auto w-full max-w-md">
        {KENYA_COUNTY_SHAPES.map(([slug, county, d], i) => {
          const on = active === slug;
          return (
            <Link key={slug} href={`/houses-for-rent/${slug}`} aria-label={county} onMouseEnter={() => setActive(slug)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(slug)} onBlur={() => setActive(null)} onTouchStart={() => setActive(slug)}>
              <path d={d} fillRule="evenodd" strokeLinejoin="round"
                style={{ fill: on ? "var(--primary)" : "color-mix(in srgb, var(--foreground) 13%, transparent)", stroke: "var(--background)", strokeWidth: on ? 0.5 : 1.2, transition: "fill 220ms, transform 400ms cubic-bezier(.34,1.56,.64,1)", transformOrigin: "50% 50%", transformBox: "fill-box", transform: on ? "scale(1.04)" : "none", animation: `dot-in 700ms cubic-bezier(.34,1.3,.64,1) ${i * 16}ms both`, cursor: "pointer" }} />
            </Link>
          );
        })}
        <path d={KENYA_OUTLINE_PATH} fill="none" pointerEvents="none" style={{ stroke: "color-mix(in srgb, var(--foreground) 45%, transparent)", strokeWidth: 1.6 }} strokeLinejoin="round" />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center" aria-live="polite">
        <span className={cn("glass-solid rounded-full px-4 py-2 text-sm font-semibold transition-[opacity,transform] duration-300", name ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>{name ?? "\u00a0"}</span>
      </div>
    </div>
  );
}
