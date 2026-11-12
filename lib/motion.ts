/**
 * motion.ts: springs, rubber band and release helpers.
 * Framework-free. Copy into the project as its one `motion` module (reuse existing helpers first).
 * Units are whatever you animate (px, 0-1 scale, degrees). Velocities are units per SECOND.
 */

// ---------------------------------------------------------------- rubber band

/** UIKit's TouchRubberBandingCoefficient. */
export const RUBBER_BAND_COEFFICIENT = 0.55;

/** How far a thing moves when pulled `pull` past its end. `dimension` is its size on the pull axis. */
export function rubberBand(pull: number, dimension: number, coefficient = RUBBER_BAND_COEFFICIENT): number {
  "worklet"; // harmless on the web; lets Reanimated run it on the UI thread
  if (dimension <= 0 || pull === 0) return 0;
  const offset = (1 - 1 / ((coefficient * Math.abs(pull)) / dimension + 1)) * dimension;
  return pull < 0 ? -offset : offset;
}

/** `value` followed 1:1 between `min` and `max`, rubber-banded beyond them. */
export function rubberBanded(value: number, min: number, max: number, dimension: number): number {
  "worklet";
  if (value > max) return max + rubberBand(value - max, dimension);
  if (value < min) return min - rubberBand(min - value, dimension);
  return value;
}

// ---------------------------------------------------------------- release helpers

export function clamp(v: number, min: number, max: number): number {
  "worklet";
  return Math.min(max, Math.max(min, v));
}

/** The snap point closest to `x`. */
export function nearest(points: readonly number[], x: number): number {
  "worklet";
  let best = points[0];
  for (const p of points) if (Math.abs(p - x) < Math.abs(best - x)) best = p;
  return best;
}

/**
 * Where a flick would come to rest if it coasted like a UIScrollView (rate 0.998 = normal, 0.99 = fast).
 * Pick the snap point nearest THIS, not the current position, so a short quick flick still advances.
 * `velocity` in units per second.
 */
export function projectedEnd(position: number, velocity: number, decelerationRate = 0.998): number {
  "worklet";
  return position + ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Smoothed velocity (units/s) from recent samples. Feed it the value you DISPLAY, not the raw finger. */
export function createVelocityTracker(windowMs = 100, staleMs = 60) {
  let samples: { v: number; t: number }[] = [];
  return {
    add(v: number, t: number = performance.now()) {
      samples.push({ v, t });
      while (samples.length > 2 && samples[0].t < t - windowMs) samples.shift();
    },
    /** Pass the release timestamp: a finger that paused before lifting has zero velocity. */
    get(now: number = performance.now()): number {
      if (samples.length < 2) return 0;
      const a = samples[0], b = samples[samples.length - 1];
      if (now - b.t > staleMs) return 0;
      const dt = (b.t - a.t) / 1000;
      return dt > 0 ? (b.v - a.v) / dt : 0;
    },
    reset() { samples = []; },
  };
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ---------------------------------------------------------------- springs

export type SpringOptions = {
  /** Seconds for one natural period (Apple's `response`). Small controls ~0.25, sheets ~0.45. */
  response?: number;
  /** 1 = no overshoot. 0.85 snappy, 0.7 bouncy. */
  dampingRatio?: number;
  /** Rest when closer than this to the target... (px default; use 0.001 for 0-1 values) */
  restDelta?: number;
  /** ...and slower than this (units/s; use 0.01 for 0-1 values). */
  restSpeed?: number;
  /** `to()` jumps straight to the end when the user prefers reduced motion. Default true. */
  respectReducedMotion?: boolean;
  onRest?: () => void;
};

/** Apple's SwiftUI presets (.smooth/.snappy/.bouncy all last ~0.5 s). Shorten `response` for small things. */
export const springs = {
  smooth: { response: 0.5, dampingRatio: 1 },
  snappy: { response: 0.5, dampingRatio: 0.85 },
  bouncy: { response: 0.5, dampingRatio: 0.7 },
} as const;

/**
 * A value that springs toward a target and can be retargeted mid-flight, keeping its speed.
 * Write the value to element.style.transform (or a CSS variable) in `onUpdate`, not to framework state.
 */
export function createSpring(initial: number, onUpdate: (value: number) => void, options: SpringOptions = {}) {
  const {
    response = 0.35, dampingRatio = 1, restDelta = 0.1, restSpeed = 1,
    respectReducedMotion = true, onRest,
  } = options;
  const stiffness = ((2 * Math.PI) / response) ** 2;
  const damping = (4 * Math.PI * dampingRatio) / response;
  let value = initial, velocity = 0, target = initial, frame = 0, last = -1;

  const step = (now: number) => {
    if (last < 0) { last = now; frame = requestAnimationFrame(step); return; } // first frame only sets the clock
    const dt = Math.min(Math.max((now - last) / 1000, 0), 1 / 30); // a stalled tab must not fling it
    last = now;
    const h = dt / 4;
    for (let i = 0; i < 4; i++) { // substeps keep stiff springs stable
      velocity += (-stiffness * (value - target) - damping * velocity) * h;
      value += velocity * h;
    }
    if (Math.abs(velocity) < restSpeed && Math.abs(value - target) < restDelta) {
      value = target; velocity = 0; frame = 0; onUpdate(value); onRest?.(); return;
    }
    onUpdate(value);
    frame = requestAnimationFrame(step);
  };

  const api = {
    /** Spring to `next`. After a drag pass the release velocity (units per second). */
    to(next: number, releaseVelocity?: number) {
      if (respectReducedMotion && prefersReducedMotion()) { api.set(next); return; }
      target = next;
      if (releaseVelocity !== undefined) velocity = releaseVelocity;
      if (!frame) { last = -1; frame = requestAnimationFrame(step); }
    },
    /** Jump with no motion and no velocity: while dragging, on grab, and for reduced motion. */
    set(next: number) {
      cancelAnimationFrame(frame); frame = 0; value = target = next; velocity = 0; onUpdate(value);
    },
    /** Freeze in place, keeping value and velocity. Call on unmount. */
    stop() { cancelAnimationFrame(frame); frame = 0; },
    get value() { return value; },
    get velocity() { return velocity; },
    get target() { return target; },
    get isAnimating() { return frame !== 0; },
  };
  return api;
}

/**
 * Sample a spring into a CSS `linear()` easing for one-shot, non-interruptible effects
 * (hover pop, tooltip, enter animation). It cannot carry velocity, so don't use it for anything grabbable.
 *   el.animate({ transform: ["scale(.9)", "scale(1)"] }, { duration, easing });
 */
export function springToCss({ response = 0.35, dampingRatio = 1 }: Pick<SpringOptions, "response" | "dampingRatio"> = {}) {
  const k = ((2 * Math.PI) / response) ** 2;
  const c = (4 * Math.PI * dampingRatio) / response;
  let x = 0, v = 0, t = 0;
  const pts = [0];
  const h = 1 / 240;
  while (t < 3) {
    for (let i = 0; i < 4; i++) { v += (-k * (x - 1) - c * v) * h; x += v * h; }
    t += 1 / 60;
    pts.push(x);
    if (Math.abs(v) < 0.001 && Math.abs(1 - x) < 0.0005) break;
  }
  pts[pts.length - 1] = 1;
  return { duration: Math.round(t * 1000), easing: `linear(${pts.map((p) => +p.toFixed(3)).join(", ")})` };
}
