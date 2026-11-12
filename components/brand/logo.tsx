import Link from "next/link";
import { cn } from "@/lib/utils";

// The supplied logo is black ink on transparent PNG. Used as CSS masks it takes any colour, so one file works in
// both themes. The dot is a separate layer so it can be orange (the brand accent).
const RATIO = 1200 / 428;
function layer(src: string, color: string) {
  return {
    backgroundColor: color,
    WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`,
    WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
    WebkitMaskSize: "contain", maskSize: "contain",
    WebkitMaskPosition: "center", maskPosition: "center",
  } as const;
}

export function LogoArt({ className }: { className?: string }) {
  return (
    <span role="img" aria-label="E.Rent a house" className={cn("relative inline-block h-10", className)} style={{ aspectRatio: String(RATIO) }}>
      <span className="absolute inset-0" style={layer("/brand/erent-wordmark-nodot.png", "currentColor")} />
      <span className="absolute inset-0" style={layer("/brand/erent-dot.png", "var(--primary)")} />
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="E.Rent, home" className={cn("inline-flex min-h-11 items-center", className)}>
      <LogoArt />
    </Link>
  );
}
