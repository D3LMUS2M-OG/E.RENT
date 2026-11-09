import Link from "next/link";
import { cn } from "@/lib/utils";

// The supplied logo is black ink on transparent PNG. Using it as a CSS mask paints it with
// currentColor, so one asset is black on light and white on dark with no extra files.
function MaskedImage({ src, ratio, className, label }: { src: string; ratio: number; className?: string; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-block bg-current", className)}
      style={{
        aspectRatio: String(ratio),
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

export function LogoMark({ className }: { className?: string }) {
  return <MaskedImage src="/brand/erent-mark.png" ratio={499 / 411} label="E.Rent" className={cn("h-8", className)} />;
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="E.Rent, home" className={cn("inline-flex min-h-11 items-center", className)}>
      <MaskedImage src="/brand/erent-wordmark.png" ratio={1200 / 428} label="E.Rent a house" className="h-10" />
    </Link>
  );
}
