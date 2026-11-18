import { cn } from "@/lib/utils";

/** A label, not a button: square-ish, flat, no border or shadow, so people can tell it is not clickable. */
export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-md bg-surface-2 px-2 py-1 text-xs font-medium capitalize text-muted", className)}>{children}</span>;
}
