"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useDismiss } from "@/components/ui/popover-menu";
import { cn } from "@/lib/utils";

/** Header dropdown. The panel is anchored to the header, opens on click, or on hover with a mouse, and closes on any outside press. */
export function MegaMenu({ label, children }: { label: string; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pathname = usePathname();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);
  useEffect(() => { setOpen(false); }, [pathname]);

  const hoverable = () => typeof matchMedia === "function" && matchMedia("(hover: hover) and (pointer: fine)").matches;
  const enter = () => { if (!hoverable()) return; clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 80); };
  const leave = () => { if (!hoverable()) return; clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 160); };

  return (
    <div ref={root} onPointerEnter={enter} onPointerLeave={leave}>
      <button type="button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}
        className={cn("inline-flex min-h-11 items-center gap-1 rounded-full px-4 text-[15px] transition-colors hover:bg-surface-2", open && "bg-surface-2 font-semibold")}>
        {label}<ChevronDown className={cn("size-4 transition-transform duration-200 ease-[var(--ease-out)]", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="motion-pop absolute inset-x-0 top-[calc(100%+6px)] z-50 origin-top rounded-[24px] border border-border bg-surface p-5 shadow-[0_24px_60px_rgba(0,0,0,.45)]" style={{ transformOrigin: "top center" }}>
          {children(close)}
        </div>
      )}
    </div>
  );
}
