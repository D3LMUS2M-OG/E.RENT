"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Swipeable row with native momentum and snap. Arrow buttons on a computer; mouse drag works too. */
export function Carousel({ children, label, itemClass = "w-[82%] sm:w-[46%] lg:w-[31%]" }: { children: React.ReactNode[]; label: string; itemClass?: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = useCallback(() => { const t = track.current; if (!t) return; setEdge({ start: t.scrollLeft < 8, end: t.scrollLeft + t.clientWidth >= t.scrollWidth - 8 }); }, []);
  useEffect(() => { update(); const t = track.current; const ro = new ResizeObserver(update); if (t) ro.observe(t); return () => ro.disconnect(); }, [update, children.length]);

  const go = (dir: 1 | -1) => { const t = track.current; if (t) t.scrollBy({ left: dir * t.clientWidth * 0.8, behavior: "smooth" }); };
  // mouse drag (touch already scrolls natively)
  const drag = useRef<{ x: number; left: number } | null>(null);
  const down = (e: React.PointerEvent) => { if (e.pointerType !== "mouse" || !track.current) return; drag.current = { x: e.clientX, left: track.current.scrollLeft }; track.current.style.scrollSnapType = "none"; };
  const move = (e: React.PointerEvent) => { if (drag.current && track.current) track.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x); };
  const up = () => { if (!drag.current || !track.current) return; drag.current = null; track.current.style.scrollSnapType = ""; };

  return (
    <div className="relative">
      <ul ref={track} aria-label={label} onScroll={update} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] md:cursor-grab md:active:cursor-grabbing [&::-webkit-scrollbar]:hidden">
        {children.map((c, i) => <li key={i} className={cn("shrink-0 snap-start", itemClass)}>{c}</li>)}
      </ul>
      <div className="mt-2 hidden justify-end gap-2 md:flex">
        {([[-1, ChevronLeft, "Previous", edge.start], [1, ChevronRight, "Next", edge.end]] as const).map(([d, I, l, off]) => (
          <button key={l} type="button" onClick={() => go(d)} disabled={off} aria-label={l} className="glass glass-frost glass-pill inline-flex size-11 items-center justify-center transition-[transform,opacity] active:scale-90 disabled:opacity-35"><I className="size-5" aria-hidden /></button>))}
      </div>
    </div>
  );
}
