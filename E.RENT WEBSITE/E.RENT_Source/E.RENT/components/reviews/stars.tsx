"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only stars. Whole and half values are drawn as filled and outlined stars. */
export function Stars({ value, className, size = "size-4" }: { value: number; className?: string; size?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} aria-hidden className={cn(size, i <= Math.round(value) ? "fill-accent text-accent" : "text-border-strong")} />)}
    </span>
  );
}

/** Pick 1 to 5 stars. Works with touch, mouse and the arrow keys; the value goes to the form in a hidden field. */
export function StarInput({ name, label, required, value: initial = 0 }: { name: string; label: string; required?: boolean; value?: number }) {
  const [value, setValue] = useState(initial);
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      <input type="hidden" name={name} value={value || ""} required={required} />
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} ${i === 1 ? "star" : "stars"}`} tabIndex={value === i || (!value && i === 1) ? 0 : -1}
          onClick={() => setValue(value === i && !required ? 0 : i)} onMouseEnter={() => setHover(i)}
          onKeyDown={(e) => { if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); setValue(Math.min(5, (value || 0) + 1)); } if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); setValue(Math.max(1, (value || 2) - 1)); } }}
          className="inline-flex size-11 items-center justify-center rounded-full transition-transform duration-200 ease-[cubic-bezier(.34,1.56,.64,1)] hover:scale-110 active:scale-90">
          <Star aria-hidden className={cn("size-7 transition-colors", i <= shown ? "fill-accent text-accent" : "text-border-strong")} />
        </button>))}
    </div>
  );
}
