"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { createSpring, clamp, createVelocityTracker, projectedEnd, rubberBanded } from "@/lib/motion";
import { mediaUrl, photoSrcSet, variant } from "@/lib/media-url";
import { cn } from "@/lib/utils";

export type GalleryPhoto = { path: string; blur: string | null };

/** Rounded photo collage. Tap any photo to open it full screen; swipe between photos, pull down to close. */
export function PhotoGallery({ photos, title }: { photos: GalleryPhoto[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const shown = photos.slice(0, 4);
  const gridAreas = shown.length >= 4 ? "'a b' 'a d' 'c d'" : shown.length === 3 ? "'a b' 'a b' 'a d'" : undefined;
  const areas = shown.length >= 4 ? ["a", "b", "c", "d"] : shown.length === 3 ? ["a", "b", "d"] : [];

  if (!photos.length) return null;
  return (
    <>
      <div className={cn("grid h-[320px] gap-2 sm:h-[440px]", shown.length === 1 ? "grid-cols-1" : "grid-cols-2", gridAreas && "grid-rows-3")} style={gridAreas ? { gridTemplateAreas: gridAreas } : undefined}>
        {shown.map((p, i) => (
          <button key={p.path} type="button" onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1} of ${photos.length} full screen`} style={areas[i] ? { gridArea: areas[i] } : undefined}
            className="group relative overflow-hidden rounded-[22px] bg-surface-2 bg-cover" >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(variant(p.path, 960))} srcSet={photoSrcSet(p.path)} sizes="(min-width:1024px) 40vw, 50vw" alt={i === 0 ? title : `${title}, photo ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : "auto"} className="size-full object-cover transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.03]" />
          </button>))}
      </div>
      <button type="button" onClick={() => setOpen(0)} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-border-strong px-4 text-sm font-semibold transition-colors hover:bg-surface-2">
        <Expand className="size-4" aria-hidden />View {photos.length > 1 ? `all ${photos.length} photos` : "photo"}
      </button>
      {open !== null && <Lightbox photos={photos} title={title} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Lightbox({ photos, title, start, onClose }: { photos: GalleryPhoto[]; title: string; start: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);
  const idx = useRef(start);
  const width = useRef(1);
  const n = photos.length;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const xs = useRef<ReturnType<typeof createSpring> | null>(null);
  const ys = useRef<ReturnType<typeof createSpring> | null>(null);

  const paint = useCallback(() => {
    const x = xs.current?.value ?? 0; const y = ys.current?.value ?? 0;
    const h = view.current?.clientHeight || 600;
    const p = clamp(Math.abs(y) / (h * 0.7), 0, 1);
    if (track.current) track.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${1 - p * 0.12})`;
    if (dialog.current) dialog.current.style.backgroundColor = `rgba(0,0,0,${0.95 - p * 0.6})`;
  }, []);

  useEffect(() => {
    const d = dialog.current!;
    if (!d.open) d.showModal();
    width.current = view.current!.clientWidth;
    xs.current = createSpring(-start * width.current, paint, { response: 0.42, dampingRatio: 0.88 });
    ys.current = createSpring(0, paint, { response: 0.4, dampingRatio: 0.9 });
    xs.current.set(-start * width.current);
    const onResize = () => { width.current = view.current!.clientWidth; xs.current?.set(-idx.current * width.current); };
    const onClose2 = () => closeRef.current();
    window.addEventListener("resize", onResize);
    d.addEventListener("close", onClose2);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("resize", onResize); d.removeEventListener("close", onClose2); document.body.style.overflow = ""; xs.current?.stop(); ys.current?.stop(); };
  }, [start, paint]);

  const go = useCallback((i: number, v?: number) => {
    const next = clamp(i, 0, n - 1); idx.current = next; setIndex(next); xs.current?.to(-next * width.current, v);
  }, [n]);

  // Drag: follows the finger 1:1, rubber-bands at the ends, and on release hands the finger's speed to a spring.
  const drag = useRef<{ x0: number; y0: number; bx: number; axis: "x" | "y" | null; vx: ReturnType<typeof createVelocityTracker>; vy: ReturnType<typeof createVelocityTracker> } | null>(null);
  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    xs.current?.set(xs.current.value); ys.current?.set(ys.current.value);
    drag.current = { x0: e.clientX, y0: e.clientY, bx: xs.current?.value ?? 0, axis: null, vx: createVelocityTracker(), vy: createVelocityTracker() };
  };
  const move = (e: React.PointerEvent) => {
    const g = drag.current; if (!g) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    if (!g.axis && Math.hypot(dx, dy) > 8) g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (g.axis === "x") {
      const v = rubberBanded(g.bx + dx, -(n - 1) * width.current, 0, width.current);
      xs.current?.set(v); g.vx.add(v);
    } else if (g.axis === "y") { ys.current?.set(dy); g.vy.add(dy); }
  };
  const up = () => {
    const g = drag.current; drag.current = null; if (!g) return;
    if (g.axis === "x") {
      const v = g.vx.get(); const end = projectedEnd(xs.current!.value, v);
      go(Math.round(-end / width.current), v);
    } else if (g.axis === "y") {
      const v = g.vy.get(); const h = view.current?.clientHeight || 600;
      if (Math.abs(projectedEnd(ys.current!.value, v)) > h * 0.35) { ys.current!.to(Math.sign(ys.current!.value || v) * h, v); setTimeout(() => dialog.current?.close(), 180); }
      else ys.current?.to(0, v);
    }
  };

  const key = (e: React.KeyboardEvent) => { if (e.key === "ArrowRight") go(idx.current + 1); if (e.key === "ArrowLeft") go(idx.current - 1); };

  return (
    <dialog ref={dialog} onKeyDown={key} aria-label={`${title}: photos`} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-black/95 p-0 text-white backdrop:bg-transparent motion-fade">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium backdrop-blur" aria-live="polite">{index + 1} / {n}</p>
        <button type="button" onClick={() => dialog.current?.close()} aria-label="Close photos" className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 backdrop-blur transition-colors hover:bg-white/20"><X className="size-5" aria-hidden /></button>
      </div>

      <div ref={view} className="h-full w-full touch-none select-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div ref={track} className="flex h-full will-change-transform">
          {photos.map((p, i) => (
            <div key={p.path} className="flex h-full w-full shrink-0 items-center justify-center px-2 pb-24 pt-16 md:px-16" aria-hidden={i !== index}>
              {Math.abs(i - index) <= 1 /* only nearby photos load: saves data on slow connections */ && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(variant(p.path, 1600))} srcSet={photoSrcSet(p.path)} sizes="100vw" alt={`${title}, photo ${i + 1} of ${n}`} draggable={false}
                  className="max-h-full max-w-full rounded-[20px] object-contain" style={p.blur ? { backgroundImage: `url(${p.blur})`, backgroundSize: "cover" } : undefined} />)}
            </div>))}
        </div>
      </div>

      {n > 1 && (<>
        <button type="button" onClick={() => go(idx.current - 1)} disabled={index === 0} aria-label="Previous photo" className="absolute left-3 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur transition-opacity hover:bg-white/20 disabled:opacity-30 md:inline-flex"><ChevronLeft className="size-6" aria-hidden /></button>
        <button type="button" onClick={() => go(idx.current + 1)} disabled={index === n - 1} aria-label="Next photo" className="absolute right-3 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur transition-opacity hover:bg-white/20 disabled:opacity-30 md:inline-flex"><ChevronRight className="size-6" aria-hidden /></button>
        <ul className="absolute inset-x-0 bottom-0 flex justify-center gap-2 overflow-x-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {photos.map((p, i) => (
            <li key={p.path}><button type="button" onClick={() => go(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === index}
              className={cn("block h-12 w-16 overflow-hidden rounded-[10px] border-2 transition-all duration-200", i === index ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-80")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(variant(p.path, 480))} alt="" className="size-full object-cover" /></button></li>))}
        </ul></>)}
    </dialog>
  );
}
