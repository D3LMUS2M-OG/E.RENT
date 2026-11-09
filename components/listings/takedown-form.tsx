"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { restore, takeDown } from "@/app/admin/moderation/actions";
import type { ActionState } from "@/app/dashboard/actions";

export function TakedownForm({ listingId, takenDown }: { listingId: string; takenDown: boolean }) {
  const [state, action, pending] = useActionState(takenDown ? restore : takeDown, {} as ActionState);
  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input type="hidden" name="listing_id" value={listingId} />
      {!takenDown && <Input name="reason" placeholder="Reason shown to the owner" aria-label="Reason" className="sm:w-72" />}
      <Button type="submit" variant={takenDown ? "secondary" : "primary"} loading={pending}>{takenDown ? "Restore as paused" : "Take down"}</Button>
      {state.error && <p role="alert" className="text-sm font-medium">Error: {state.error}</p>}
      {state.message && <p role="status" className="text-sm font-medium">{state.message}</p>}
    </form>
  );
}
