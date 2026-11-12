"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Choice = "system" | "dark" | "light";
export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>("system");
  useEffect(() => { try { const t = localStorage.getItem("erent-theme"); if (t === "dark" || t === "light") setChoice(t); } catch {} }, []);
  function pick(c: Choice) {
    setChoice(c);
    try { if (c === "system") { localStorage.removeItem("erent-theme"); delete document.documentElement.dataset.theme; } else { localStorage.setItem("erent-theme", c); document.documentElement.dataset.theme = c; } } catch {}
  }
  return (
    <div role="radiogroup" aria-label="Theme" className="flex gap-1 rounded-full border border-border p-1">
      {(["system", "dark", "light"] as const).map((c) => (
        <button key={c} type="button" role="radio" aria-checked={choice === c} onClick={() => pick(c)}
          className={cn("min-h-9 flex-1 rounded-full px-3 text-sm font-medium capitalize transition-colors", choice === c ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground")}>{c}</button>))}
    </div>
  );
}
