"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

type Options = { title?: string; message: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean };
type Ask = (o: Options | string) => Promise<boolean>;
const Ctx = createContext<Ask>(async (o) => (typeof window !== "undefined" ? window.confirm(typeof o === "string" ? o : o.message) : false));

/** Replaces the browser's plain confirm box with a frosted-glass dialog: `const ask = useConfirm(); if (await ask("Delete?")) …` */
export const useConfirm = () => useContext(Ctx);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<Options | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const ask = useCallback<Ask>((o) => new Promise<boolean>((resolve) => {
    opener.current = document.activeElement as HTMLElement | null;
    resolver.current = resolve; setOpts(typeof o === "string" ? { message: o } : o);
  }), []);
  const done = useCallback((v: boolean) => { resolver.current?.(v); resolver.current = null; setOpts(null); opener.current?.focus?.(); }, []);

  useEffect(() => {
    if (!opts) return;
    okRef.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") done(false); };
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [opts, done]);

  return (
    <Ctx.Provider value={ask}>
      {children}
      {opts && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
          <button type="button" aria-label="Cancel" tabIndex={-1} onClick={() => done(false)} className="motion-fade absolute inset-0 cursor-default bg-black/45 backdrop-blur-[3px]" />
          <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-msg" className="glass glass-frost motion-rise relative w-full max-w-sm space-y-4 rounded-[28px] p-6 mb-[env(safe-area-inset-bottom)]">
            <h2 id="confirm-title" className="text-xl">{opts.title ?? "Are you sure?"}</h2>
            <p id="confirm-msg" className="text-[15px] text-muted">{opts.message}</p>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => done(false)}>{opts.cancelLabel ?? "Cancel"}</Button>
              <Button ref={okRef} type="button" variant={opts.danger === false ? "primary" : "danger"} className="flex-1" onClick={() => done(true)}>{opts.confirmLabel ?? "Yes, continue"}</Button>
            </div>
          </div>
        </div>, document.body)}
    </Ctx.Provider>
  );
}
