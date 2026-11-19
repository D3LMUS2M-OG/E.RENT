"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { removeReview } from "@/app/admin/reviews/actions";

export function RemoveReviewForm({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (_: { error?: string; ok?: boolean }, fd: FormData) => removeReview(id, fd), {} as { error?: string; ok?: boolean });
  if (state.ok) return <p role="status" className="text-sm font-medium">Removed and logged.</p>;
  if (!open) return <Button variant="danger" onClick={() => setOpen(true)}>Remove this review</Button>;
  return (
    <form action={action} className="space-y-2">
      <label htmlFor={`why-${id}`} className="text-sm font-medium">Proof or reason (kept in the audit log)</label>
      <textarea id={`why-${id}`} name="reason" required minLength={15} rows={3} className="w-full rounded-[14px] border border-border-strong bg-background/60 p-3" placeholder="For example: contains a false accusation of a crime, supporting document attached to case 123" />
      {state.error && <p role="alert" className="text-sm font-medium">Error: {state.error}</p>}
      <div className="flex gap-2"><Button type="submit" variant="danger" loading={pending}>Remove</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
    </form>
  );
}
