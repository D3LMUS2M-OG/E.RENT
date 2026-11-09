import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { AuthNav } from "./auth-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1">
          <Button asChild variant="ghost"><Link href="/search">Search</Link></Button>
          <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link href="/counties">Counties</Link></Button>
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
