"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getThemeChoice, setThemeChoice, type ThemeChoice } from "@/lib/theme";

export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  useEffect(() => {
    const sync = () => setChoice(getThemeChoice());
    sync(); window.addEventListener("erent:theme", sync);
    return () => window.removeEventListener("erent:theme", sync);
  }, []);
  return (
    <div role="radiogroup" aria-label="Theme" className="flex gap-1 rounded-full border border-border bg-background p-1">
      {(["system", "dark", "light"] as const).map((c) => (
        <button key={c} type="button" role="radio" aria-checked={choice === c} onClick={() => setThemeChoice(c)}
          className={cn("min-h-9 flex-1 rounded-full px-3 text-sm font-medium capitalize transition-colors", choice === c ? "bg-primary text-primary-foreground shadow-[var(--shadow-primary)]" : "text-muted hover:text-foreground")}>{c}</button>))}
    </div>
  );
}
