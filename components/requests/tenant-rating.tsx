"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { StarInput } from "@/components/reviews/stars";
import { rateTenant, type ReviewState } from "@/app/reviews/actions";

/** For the landlord, after the rental is confirmed. Other landlords see the average and the short note, never the tenant. */
export function TenantRating({ rentalId, current }: { rentalId: string; current?: { rating: number; note: string } }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(rateTenant.bind(null, rentalId), {});
  return (
    <form action={action} className="space-y-3 rounded-[16px] border border-border bg-background/50 p-4">
      <p className="text-sm font-semibold">{current ? "Your rating of this tenant" : "Rate this tenant"} <span className="font-normal text-muted">(shown only to other landlords)</span></p>
      <StarInput name="rating" label="Rating of the tenant" required value={current?.rating ?? 0} />
      <label htmlFor={`tn-${rentalId}`} className="sr-only">Short note</label>
      <input id={`tn-${rentalId}`} name="note" maxLength={200} defaultValue={current?.note ?? ""} placeholder="A fair, factual note, for example: paid on time, left the house clean" className="min-h-11 w-full rounded-[14px] border border-border-strong bg-background/60 px-3.5" />
      {state.error && <p role="alert" className="text-sm font-medium">Error: {state.error}</p>}
      <div className="flex items-center gap-3"><Button type="submit" variant="secondary" loading={pending}>{current ? "Update rating" : "Save rating"}</Button>{state.ok && <span role="status" className="text-sm font-medium">Saved</span>}</div>
    </form>
  );
}
