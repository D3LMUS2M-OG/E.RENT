"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { replyToReview, type ReviewState } from "@/app/reviews/actions";

export function ReplyForm({ reviewId, existing }: { reviewId: string; existing?: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ReviewState, FormData>(replyToReview.bind(null, reviewId), {});
  if (!open && !state.ok) return <Button variant="secondary" onClick={() => setOpen(true)}>{existing ? "Edit your reply" : "Reply publicly"}</Button>;
  if (state.ok) return <p role="status" className="text-sm font-medium">Reply saved. It is now public.</p>;
  return (
    <form action={action} className="space-y-3">
      <label htmlFor={`reply-${reviewId}`} className="text-sm font-medium">Your public reply</label>
      <textarea id={`reply-${reviewId}`} name="body" required maxLength={1000} rows={4} defaultValue={existing ?? ""} className="w-full rounded-[18px] border border-border-strong bg-background/60 p-3.5 text-base" placeholder="Thank them, answer fairly and stay polite. Everyone can read this." />
      {state.error && <p role="alert" className="text-sm font-medium">Error: {state.error}</p>}
      <div className="flex gap-2"><Button type="submit" loading={pending}>Post reply</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
    </form>
  );
}
