"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Change this one number to make the photos stay longer or shorter (milliseconds). */
const SLIDE_MS = 8000;

const SLIDES = [1, 2, 3] as const;
const WIDTHS = [1280, 1920, 2576] as const;
const srcSet = (n: number) => WIDTHS.map((w) => `/landing/hero-${n}-${w}.webp ${w}w`).join(", ");

/** Kenyan homes that cross-fade, one after the other, with a very slow drift on the photo that is showing.
 *  The photos are decorative (the page says everything in words), so they are hidden from screen readers.
 *  People can pause the show or jump to a photo. It does not start on its own for people who reduce motion. */
export function HeroSlideshow() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => { setReduced(prefersReducedMotion()); }, []);

  // Depends on `i`, so choosing a photo by hand restarts the timer instead of changing it a moment later
  useEffect(() => {
    if (paused || reduced) return;
    const t = setInterval(() => { if (!document.hidden) setI((v) => (v + 1) % SLIDES.length); }, SLIDE_MS);
    return () => clearInterval(t);
  }, [paused, reduced, i]);

  return (
    <>
      <div className="hero-photo" aria-hidden>
        {SLIDES.map((n, k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={n} src={`/landing/hero-${n}-1920.webp`} srcSet={srcSet(n)} sizes="(min-width:1024px) 80vw, 100vw" width={2576} height={1438} alt="" data-active={k === i}
            loading="eager" decoding="async" fetchPriority={k === 0 ? "high" : "auto"} draggable={false} className="hero-slide" />
        ))}
      </div>
      <div className="hero-controls glass glass-frost glass-pill flex items-center p-1" role="group" aria-label="Photo slideshow">
        <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused || reduced ? "Play photo slideshow" : "Pause photo slideshow"}
          className="inline-flex size-11 items-center justify-center rounded-full transition-colors hover:bg-surface-2">
          {paused || reduced ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
        </button>
        {SLIDES.map((n, k) => (
          <button key={n} type="button" onClick={() => setI(k)} aria-label={`Show photo ${n} of ${SLIDES.length}`} aria-current={k === i}
            className="group inline-flex size-11 items-center justify-center rounded-full">
            <span className={cn("block h-2 rounded-full bg-foreground/40 transition-[width,background-color] duration-500 ease-[var(--ease-out)] group-hover:bg-foreground/70", k === i ? "w-6 bg-primary group-hover:bg-primary" : "w-2")} />
          </button>
        ))}
      </div>
    </>
  );
}
