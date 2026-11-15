"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { RequestPanel } from "@/components/requests/request-panel";
import { useSession } from "@/components/layout/session-provider";
import { formatKes } from "@/lib/utils";

/** Fixed to the bottom on phones and tablets: the rent, and the one thing to do next. */
export function ListingActionBar({ listingId, ownerId, createdBy, rent }: { listingId: string; ownerId: string; createdBy: string; rent: number }) {
  const [open, setOpen] = useState(false);
  const s = useSession();
  const mine = s.userId === ownerId || s.userId === createdBy;
  return (
    <>
      <div className="glass glass-nav fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3 rounded-[28px] p-2 pl-5 lg:hidden">
        <p className="min-w-0 leading-tight"><span className="block text-xl font-semibold text-accent">{formatKes(rent)}</span><span className="text-xs text-muted">per month</span></p>
        {mine
          ? <Button asChild size="lg"><Link href={`/dashboard/listings/${listingId}/edit`}><Pencil className="size-4" aria-hidden />Manage</Link></Button>
          : <Button size="lg" onClick={() => setOpen(true)}>Request to view</Button>}
      </div>
      {open && <BottomSheet title="Contact the landlord" onClose={() => setOpen(false)}><RequestPanel listingId={listingId} ownerId={ownerId} createdBy={createdBy} /></BottomSheet>}
    </>
  );
}
