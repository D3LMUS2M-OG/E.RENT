"use client";

import { useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { createSpring, createVelocityTracker, projectedEnd } from "@/lib/motion";

/** A sheet that rises from the bottom on a spring. Drag the handle down, or press outside, to close. */
export function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const spring = useRef<ReturnType<typeof createSpring> | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const height = useRef(600);

  const paint = useCallback((y: number) => {
    if (sheet.current) sheet.current.style.transform = `translateY(${Math.max(0, y)}px)`;
    if (dialog.current) dialog.current.style.backgroundColor = `rgba(0,0,0,${0.55 * Math.max(0, 1 - y / (height.current || 600))})`;
  }, []);

  useEffect(() => {
    const d = dialog.current!;
    if (!d.open) d.showModal();
    height.current = sheet.current?.offsetHeight || 600;
    spring.current = createSpring(height.current, paint, { response: 0.45, dampingRatio: 0.92 });
    spring.current.set(height.current);
    requestAnimationFrame(() => spring.current?.to(0));
    const onClose2 = () => closeRef.current();
    d.addEventListener("close", onClose2);
    document.body.style.overflow = "hidden";
    return () => { d.removeEventListener("close", onClose2); document.body.style.overflow = ""; spring.current?.stop(); };
  }, [paint]);

  const dismiss = useCallback((v = 0) => { spring.current?.to(height.current, v); setTimeout(() => dialog.current?.close(), 200); }, []);

  const drag = useRef<{ y0: number; base: number; vel: ReturnType<typeof createVelocityTracker> } | null>(null);
  const down = (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); spring.current?.set(spring.current.value); drag.current = { y0: e.clientY, base: spring.current?.value ?? 0, vel: createVelocityTracker() }; };
  const move = (e: React.PointerEvent) => { const g = drag.current; if (!g) return; const y = Math.max(0, g.base + e.clientY - g.y0); spring.current?.set(y); g.vel.add(y); };
  const up = () => {
    const g = drag.current; drag.current = null; if (!g) return;
    const v = g.vel.get(); const y = spring.current!.value;
    if (projectedEnd(y, v) > height.current * 0.4) dismiss(v); else spring.current?.to(0, v);
  };

  return (
    <dialog ref={dialog} aria-label={title} onPointerDown={(e) => { if (e.target === e.currentTarget) dismiss(); }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-foreground backdrop:bg-transparent">
      <div ref={sheet} className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] w-full max-w-xl flex-col rounded-t-[28px] border border-b-0 border-border bg-surface shadow-[0_-20px_60px_rgba(0,0,0,.45)] will-change-transform">
        <div className="shrink-0 touch-none select-none px-5 pb-2 pt-3" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <span aria-hidden className="mx-auto mb-2 block h-1.5 w-11 rounded-full bg-border-strong" />
          <div className="flex items-center justify-between"><h2 className="text-xl">{title}</h2>
            <button type="button" onClick={() => dismiss()} aria-label="Close" className="inline-flex size-11 items-center justify-center rounded-full transition-colors hover:bg-surface-2"><X className="size-5" aria-hidden /></button></div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </dialog>
  );
}
