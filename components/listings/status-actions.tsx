"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { changeStatus, type ActionState } from "@/app/dashboard/actions";
import type { ListingStatus } from "@/lib/types";

type Btn = { intent: string; label: string; variant?: "primary" | "secondary" | "ghost" };

function buttonsFor(status: ListingStatus, isOwner: boolean, unitsAvailable: number): Btn[] {
  const b: Btn[] = [];
  switch (status) {
    case "draft": b.push(isOwner ? { intent: "publish", label: "Publish" } : { intent: "submit", label: "Submit to landlord" }); break;
    case "pending_owner_approval": if (isOwner) b.push({ intent: "approve", label: "Approve and publish" }); break;
    case "active":
      b.push({ intent: "renew", label: "Renew for 90 days", variant: "secondary" }, { intent: "pause", label: "Pause", variant: "secondary" });
      if (unitsAvailable > 0) b.push({ intent: "rent_one", label: "Mark one unit rented", variant: "secondary" });
      b.push({ intent: "unavailable", label: "Mark unavailable", variant: "ghost" });
      break;
    case "paused": case "unavailable": case "expired": case "rented": b.push({ intent: "relist", label: "Relist for 90 days" }); break;
  }
  if (isOwner && ["draft", "paused", "unavailable", "expired", "rented"].includes(status)) b.push({ intent: "delete", label: "Delete", variant: "ghost" });
  return b;
}

export function StatusActions({ id, status, isOwner, unitsAvailable }: { id: string; status: ListingStatus; isOwner: boolean; unitsAvailable: number }) {
  const [state, action, pending] = useActionState(changeStatus.bind(null, id), {} as ActionState);
  const buttons = buttonsFor(status, isOwner, unitsAvailable);
  if (!buttons.length) return null;
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {buttons.map((b) => (
          <Button key={b.intent} name="intent" value={b.intent} variant={b.variant ?? "primary"} loading={pending} type="submit"
            onClick={(e) => { if (b.intent === "delete" && !confirm("Delete this listing and its photos?")) e.preventDefault(); }}>
            {b.label}
          </Button>
        ))}
      </div>
      {state.error && <p role="alert" className="text-sm font-medium">Error: {state.error}</p>}
    </form>
  );
}
