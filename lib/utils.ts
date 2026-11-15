import type { CSSProperties } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatKes = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

/** Sets the --i CSS variable that staggers an entrance animation. */
export const stagger = (i: number) => ({ "--i": i }) as CSSProperties;
