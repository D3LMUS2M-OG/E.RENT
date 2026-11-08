import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** State is carried by shape, icon and text, never colour alone (PRD 7.1). */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border border-border-strong px-2 py-0.5 text-xs font-medium", className)}>
      <BadgeCheck className="size-3.5" aria-hidden />
      Verified
    </span>
  );
}
