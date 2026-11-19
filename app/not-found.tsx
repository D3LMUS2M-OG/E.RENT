import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center gap-5 px-4 text-center">
      <p className="font-serif text-7xl font-bold text-accent">404</p>
      <h1 className="text-3xl">We could not find that page</h1>
      <p className="text-muted">The link may be old, or the house may have been rented or removed. Try a search, or start from the home page.</p>
      <div className="flex flex-wrap justify-center gap-3"><Button asChild size="lg"><Link href="/search"><Search className="size-5" aria-hidden />Search houses</Link></Button><Button asChild size="lg" variant="secondary"><Link href="/"><Home className="size-5" aria-hidden />Home</Link></Button></div>
    </div>
  );
}
