"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useDismiss } from "@/components/ui/popover-menu";
import { cn } from "@/lib/utils";
import { getThemeChoice, resolvedTheme, setThemeChoice, type ThemeChoice } from "@/lib/theme";

const OPTIONS: [ThemeChoice, string, typeof Sun][] = [["system", "System", Monitor], ["dark", "Dark", Moon], ["light", "Light", Sun]];

/** Sun and moon button that opens System, Dark or Light. Works for signed-out visitors too. */
export function ThemeMenu({ className, align = "right" }: { className?: string; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [shown, setShown] = useState<"dark" | "light">("dark");
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(root, open, close);
  useEffect(() => {
    const sync = () => { const c = getThemeChoice(); setChoice(c); setShown(resolvedTheme(c)); };
    sync(); window.addEventListener("erent:theme", sync);
    const mq = matchMedia("(prefers-color-scheme: light)"); mq.addEventListener("change", sync);
    return () => { window.removeEventListener("erent:theme", sync); mq.removeEventListener("change", sync); };
  }, []);
  const Icon = shown === "light" ? Sun : Moon;
  return (
    <div ref={root} className={cn("relative", className)}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label="Change theme" onClick={() => setOpen((o) => !o)}
        className="inline-flex size-11 items-center justify-center rounded-full text-foreground transition-[transform,background-color] duration-200 hover:bg-foreground/10 active:scale-90">
        <Icon key={shown} className="motion-pop size-5" aria-hidden />
      </button>
      {open && (
        <div role="menu" aria-label="Theme" className={cn("glass-solid motion-pop absolute z-50 mt-3 w-44 space-y-1 rounded-[22px] p-1.5", align === "right" ? "right-0" : "left-0")}>
          {OPTIONS.map(([c, label, I]) => (
            <button key={c} type="button" role="menuitemradio" aria-checked={choice === c} onClick={() => { setThemeChoice(c); close(); }}
              className={cn("flex min-h-11 w-full items-center gap-2.5 rounded-[16px] px-3 text-[15px] font-medium transition-colors hover:bg-foreground/10", choice === c && "bg-foreground/10")}>
              <I className="size-[18px]" aria-hidden />{label}{choice === c && <Check className="ml-auto size-4 text-accent" aria-hidden />}
            </button>))}
        </div>
      )}
    </div>
  );
}
