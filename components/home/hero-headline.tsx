import { Fragment } from "react";
import { cn } from "@/lib/utils";

/** The hero headline. Every word rises into place out of a soft blur, one after the other (see .hero-word in globals.css).
 *  Plain server markup, so it is in the page from the first byte and works without JavaScript. Screen readers read it as normal text. */
export function HeroHeadline({ lead, accent, className }: { lead: string; accent: string; className?: string }) {
  const words = [...lead.split(" ").map((t) => ({ t, a: false })), ...accent.split(" ").map((t) => ({ t, a: true }))];
  return (
    <h1 className={className}>
      {words.map((w, k) => (
        <Fragment key={k}>
          <span className={cn("hero-word", w.a && "text-accent")} style={{ "--w": k } as React.CSSProperties}>{w.t}</span>
          {k < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </h1>
  );
}
