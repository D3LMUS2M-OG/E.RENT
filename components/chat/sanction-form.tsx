"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { dismissReport, issueSanction } from "@/app/admin/reports/actions";
import type { ActionState } from "@/app/dashboard/actions";

const sel = "min-h-11 w-full rounded-md border border-border-strong bg-background px-3 text-base";

export function SanctionForm({ reportId, userId, canDismiss = true }: { reportId?: string; userId: string; canDismiss?: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState("warning");
  const [s, action, pending] = useActionState(async (p: ActionState, f: FormData) => { const r = await issueSanction(p, f); router.refresh(); return r; }, {} as ActionState);
  const [d, dismiss, dp] = useActionState(async (p: ActionState, f: FormData) => { const r = await dismissReport(p, f); router.refresh(); return r; }, {} as ActionState);
  return (
    <div className="space-y-6">
      <form action={action} className="space-y-3">
        <input type="hidden" name="user_id" value={userId} />{reportId && <input type="hidden" name="report_id" value={reportId} />}
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <div><label htmlFor="kind" className="mb-1 block text-sm font-medium">Action</label>
            <select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={sel}>
              <option value="warning">Warn</option><option value="summons">Summon to respond</option><option value="suspension">Suspend</option><option value="ban">Ban</option></select></div>
          {kind === "suspension" && <div><label htmlFor="days" className="mb-1 block text-sm font-medium">Days</label><input id="days" name="days" type="number" min={1} max={365} defaultValue={7} className={sel} /></div>}
        </div>
        <label htmlFor="reason" className="block text-sm font-medium">Reason (the user sees this)</label>
        <textarea id="reason" name="reason" rows={3} maxLength={1000} className="w-full rounded-md border border-border-strong bg-background p-3 text-base" />
        {s.error && <p role="alert" className="text-sm font-medium">Error: {s.error}</p>}{s.message && <p role="status" className="text-sm font-medium">{s.message}</p>}
        <Button type="submit" loading={pending}>Apply</Button>
      </form>
      {reportId && canDismiss && (
        <form action={dismiss} className="space-y-2 border-t border-border pt-4">
          <input type="hidden" name="report_id" value={reportId} />
          <label htmlFor="note" className="block text-sm font-medium">Or dismiss this report</label>
          <input id="note" name="note" placeholder="Note (optional)" className={sel} />
          {d.error && <p role="alert" className="text-sm font-medium">Error: {d.error}</p>}{d.message && <p role="status" className="text-sm font-medium">{d.message}</p>}
          <Button type="submit" variant="secondary" loading={dp}>Dismiss report</Button>
        </form>)}
    </div>
  );
}
