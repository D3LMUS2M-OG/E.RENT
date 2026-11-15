import { avatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const initials = (n: string) => (n.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("") || "·").toUpperCase();

/** The person's picture, or their initials when they have not added one. */
export function Avatar({ name, path, className }: { name: string; path?: string | null; className?: string }) {
  const url = avatarUrl(path);
  return (
    <span className={cn("relative inline-flex size-11 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-surface-2 text-sm font-semibold text-foreground", className)}>
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
        : <span aria-hidden>{initials(name)}</span>}
      <span className="sr-only">{name ? `${name}'s picture` : "Profile picture"}</span>
    </span>
  );
}
