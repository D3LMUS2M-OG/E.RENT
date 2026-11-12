"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MegaMenu } from "./mega-menu";
import { HOUSE_TYPES, QUICK_AMENITIES, regionLinks } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const chip = "inline-flex min-h-10 items-center rounded-full border border-border px-3.5 text-sm hover:bg-surface-2";

export function DesktopNav() {
  const path = usePathname();
  const active = (p: string) => path === p || path.startsWith(p + "/");
  return (
    <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
      <Link href="/search" className={cn("inline-flex min-h-11 items-center rounded-full px-4 text-[15px] transition-colors hover:bg-surface-2", active("/search") && "bg-surface-2 font-semibold")}>Search</Link>
      <MegaMenu label="Counties">
        {(close) => (
          <div className="space-y-5">
            <div className="grid gap-x-6 gap-y-5 lg:grid-cols-4">
              {regionLinks.map((r) => (
                <div key={r.name} className={r.name === "Rift Valley" ? "lg:col-span-2" : ""}>
                  <h3 className="mb-2 text-sm font-semibold">{r.name}</h3>
                  <ul className={cn("grid gap-0.5", r.name === "Rift Valley" && "grid-cols-2")}>
                    {r.counties.map((c) => <li key={c.slug}><Link onClick={close} href={`/houses-for-rent/${c.slug}`} className="block rounded-[10px] px-2.5 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-foreground">{c.name}</Link></li>)}
                  </ul>
                </div>))}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border pt-4"><Button asChild size="default"><Link onClick={close} href="/counties">All 47 counties</Link></Button></div>
          </div>)}
      </MegaMenu>
      <MegaMenu label="House types">
        {(close) => (
          <div className="space-y-5">
            <ul className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {HOUSE_TYPES.map(([slug, name]) => <li key={slug}><Link onClick={close} href={`/search?type=${slug}`} className="flex min-h-11 items-center rounded-[14px] border border-border px-3.5 text-sm hover:bg-surface-2">{name}</Link></li>)}
            </ul>
            <div className="border-t border-border pt-4"><p className="mb-2 text-sm font-semibold">With</p>
              <ul className="flex flex-wrap gap-2">{QUICK_AMENITIES.map(([slug, name]) => <li key={slug}><Link onClick={close} href={`/search?amenity=${slug}`} className={chip}>{name}</Link></li>)}</ul></div>
          </div>)}
      </MegaMenu>
      <Link href="/search?type=student-housing" className={cn("inline-flex min-h-11 items-center rounded-full px-4 text-[15px] transition-colors hover:bg-surface-2")}>Student housing</Link>
    </nav>
  );
}
