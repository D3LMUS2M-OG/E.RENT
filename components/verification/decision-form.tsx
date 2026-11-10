"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { decide, purgeDocuments } from "@/app/admin/verifications/actions";
import type { ActionState } from "@/app/dashboard/actions";

export function DecisionForm({ id, status, hasDocs }: { id: string; status: string; hasDocs: boolean }) {
  const [d, decideAction, dp] = useActionState(decide, {} as ActionState);
  const [p, purgeAction, pp] = useActionState(purgeDocuments, {} as ActionState);
  return (
    <div className="space-y-6">
      {(status === "pending" || status === "approved") && (
        <form action={decideAction} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <label htmlFor="reason" className="text-sm font-medium">{status === "approved" ? "Reason to revoke" : "Reason (required to reject)"}</label>
          <textarea id="reason" name="reason" rows={3} className="w-full rounded-md border border-border-strong bg-background p-3 text-base" />
          <div className="flex flex-wrap gap-3">
            {status === "pending" && <Button name="decision" value="approved" loading={dp}>Approve</Button>}
            <Button name="decision" value="rejected" variant="secondary" loading={dp}>{status === "approved" ? "Revoke" : "Reject"}</Button>
          </div>
          {d.error && <p role="alert" className="text-sm font-medium">Error: {d.error}</p>}
          {d.message && <p role="status" className="text-sm font-medium">{d.message}</p>}
        </form>
      )}
      {status !== "pending" && hasDocs && (
        <form action={purgeAction} className="space-y-2">
          <input type="hidden" name="id" value={id} />
          <Button variant="secondary" loading={pp}>Delete the identity documents now</Button>
          {p.error && <p role="alert" className="text-sm font-medium">Error: {p.error}</p>}
          {p.message && <p role="status" className="text-sm font-medium">{p.message}</p>}
        </form>
      )}
    </div>
  );
}
