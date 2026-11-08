import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1">
          <Button asChild variant="ghost"><Link href="/search">Search</Link></Button>
          <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link href="/counties">Counties</Link></Button>
          {signedIn ? (
            <Button asChild variant="secondary"><Link href="/account">Account</Link></Button>
          ) : (
            <Button asChild><Link href="/sign-in">Sign in</Link></Button>
          )}
        </nav>
      </div>
    </header>
  );
}
