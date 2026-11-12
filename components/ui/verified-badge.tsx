import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Sky blue, with the icon and the word. Never colour alone. */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-link px-2.5 py-0.5 text-xs font-semibold text-link", className)}>
      <BadgeCheck className="size-3.5" aria-hidden />
      Verified
    </span>
  );
}
