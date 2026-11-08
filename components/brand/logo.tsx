import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={cn("size-8", className)} aria-hidden>
      <path d="M32 11 10 29v24h44V29L32 11Z" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
      <path d="M25 27h15M25 36h12M25 45h15M25 27v18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="E.Rent home" className={cn("inline-flex min-h-11 items-center gap-2", className)}>
      <LogoMark />
      <span className="text-xl font-semibold tracking-tight">E.Rent</span>
    </Link>
  );
}
