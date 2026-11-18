"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

/** Closes when you press outside the element, press Escape, or move keyboard focus out of it. */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const outside = (e: Event) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("focusin", outside); document.removeEventListener("keydown", key); };
  }, [ref, open, onClose]);
}

/** A button that opens a panel. The panel grows out of the button's corner (180 ms ease-out). */
export function PopoverMenu({ label, ariaLabel, children, className, panelClassName }: {
  label: React.ReactNode;
  ariaLabel?: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  className?: string;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") button.current?.focus(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button ref={button} type="button" aria-haspopup="true" aria-expanded={open} aria-label={ariaLabel} onClick={() => setOpen((o) => !o)}
        className={cn("inline-flex min-h-11 items-center rounded-full border border-border-strong px-4 text-sm font-semibold transition-colors hover:bg-surface-2", className)}>
        {label}
      </button>
      {open && (
        <div className={cn("motion-pop absolute right-0 z-50 mt-2 max-h-[70dvh] w-[min(22rem,90vw)] space-y-4 overflow-y-auto rounded-[20px] border border-border bg-surface p-4 shadow-[0_24px_60px_rgba(0,0,0,.45)]", panelClassName)}>
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}
