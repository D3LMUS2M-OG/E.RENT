"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LayoutGrid, List, Map } from "lucide-react";
import { ListingCard, type ListingCardData } from "./listing-card";
import { ListingRow } from "./listing-row";
import { cn } from "@/lib/utils";

type Layout = "gallery" | "list";
const KEY = "erent-layout";

/** Houses as a gallery of photo cards or as a compact list. Your choice is remembered on this device. */
export function ListingResults({ listings, mapHref, className }: { listings: ListingCardData[]; mapHref?: string; className?: string }) {
  const [layout, setLayout] = useState<Layout>("gallery");
  useEffect(() => { try { const v = localStorage.getItem(KEY); if (v === "list" || v === "gallery") setLayout(v); } catch {} }, []);
  const pick = (l: Layout) => { setLayout(l); try { localStorage.setItem(KEY, l); } catch {} };
  const seg = "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors";

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-end gap-2">
        <div role="group" aria-label="Layout" className="flex gap-1 rounded-full border border-border bg-surface p-1">
          <button type="button" onClick={() => pick("gallery")} aria-pressed={layout === "gallery"} className={cn(seg, layout === "gallery" ? "bg-primary text-primary-foreground shadow-[var(--shadow-primary)]" : "text-muted hover:text-foreground")}><LayoutGrid className="size-4" aria-hidden />Gallery</button>
          <button type="button" onClick={() => pick("list")} aria-pressed={layout === "list"} className={cn(seg, layout === "list" ? "bg-primary text-primary-foreground shadow-[var(--shadow-primary)]" : "text-muted hover:text-foreground")}><List className="size-4" aria-hidden />List</button>
          {mapHref && <Link href={mapHref} className={cn(seg, "text-muted hover:text-foreground")}><Map className="size-4" aria-hidden />Map</Link>}
        </div>
      </div>
      {layout === "gallery" ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{listings.map((l) => <li key={l.slug}><ListingCard listing={l} /></li>)}</ul>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">{listings.map((l) => <li key={l.slug}><ListingRow listing={l} /></li>)}</ul>
      )}
    </div>
  );
}
