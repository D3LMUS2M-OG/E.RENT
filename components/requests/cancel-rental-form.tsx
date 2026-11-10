"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelRental } from "@/app/requests/actions";
import type { ActionState } from "@/app/dashboard/actions";

export function CancelRentalForm({ rentalId }: { rentalId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [s, action, pending] = useActionState(async (prev: ActionState, f: FormData) => { const r = await cancelRental(rentalId, prev, f); if (r.ok) router.refresh(); return r; }, {} as ActionState);
  if (!open) return <Button type="button" variant="ghost" onClick={() => setOpen(true)}>Cancel this rental</Button>;
  return (
    <form action={action} className="w-full space-y-2 rounded-md border border-border p-3">
      <label htmlFor={`reason-${rentalId}`} className="text-sm font-medium">Why is the rental being cancelled?</label>
      <textarea id={`reason-${rentalId}`} name="reason" rows={3} maxLength={500} className="w-full rounded-md border border-border-strong bg-background p-3 text-base" />
      <p className="text-sm text-muted">The other person sees this. The unit goes back on the listing, and the listing is paused so the landlord can relist it.</p>
      {s.error && <p role="alert" className="text-sm font-medium">Error: {s.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>Cancel the rental</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Keep it</Button>
      </div>
    </form>
  );
}
