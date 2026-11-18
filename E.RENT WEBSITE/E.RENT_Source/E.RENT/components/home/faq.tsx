"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((it, i) => {
        const on = open === i;
        return (
          <li key={it.q}>
            <h3><button type="button" aria-expanded={on} aria-controls={`faq-${i}`} id={`faq-b-${i}`} onClick={() => setOpen(on ? null : i)}
              className="flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left text-[17px] font-semibold">
              {it.q}
              <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border-strong transition-[transform,background-color] duration-500 ease-[cubic-bezier(.34,1.56,.64,1)]", on && "rotate-[135deg] bg-primary text-primary-foreground")}><Plus className="size-4" aria-hidden /></span>
            </button></h3>
            <div id={`faq-${i}`} role="region" aria-labelledby={`faq-b-${i}`} data-open={on} className="faq-body"><div className="overflow-hidden"><p className={cn("max-w-2xl pb-5 text-[15px] leading-relaxed text-muted transition-opacity duration-500", on ? "opacity-100" : "opacity-0")}>{it.a}</p></div></div>
          </li>);
      })}
    </ul>
  );
}
