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

/** A button that opens a panel. Replaces <details>, which stays open until you press its button again. */
export function PopoverMenu({ label, children, className, panelClassName }: {
  label: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  className?: string;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);

  // Escape returns focus to the button, like any menu
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") button.current?.focus(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button ref={button} type="button" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={cn("inline-flex min-h-11 items-center rounded-md border border-border-strong px-3 text-sm font-medium transition-colors hover:bg-surface", className)}>
        {label}
      </button>
      {open && (
        <div className={cn("absolute right-0 z-10 mt-2 max-h-[70dvh] w-[min(22rem,90vw)] space-y-4 overflow-y-auto rounded-lg border border-border bg-background p-4", panelClassName)}>
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}
