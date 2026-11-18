"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { inviteDelegate } from "@/app/dashboard/team/actions";
import type { ActionState } from "@/app/dashboard/actions";

export function InviteForm() {
  const [s, action, pending] = useActionState(inviteDelegate, {} as ActionState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label="Their email address" htmlFor="invite-email"><Input id="invite-email" name="email" type="email" autoComplete="off" /></Field>
        <Field label="Role" htmlFor="invite-kind">
          <select id="invite-kind" name="kind" className="min-h-11 w-full rounded-[14px] border border-border-strong bg-surface px-3 text-base"><option value="caretaker">Caretaker</option><option value="agent">Agent</option></select>
        </Field>
      </div>
      {s.error && <p role="alert" className="text-sm font-medium">Error: {s.error}</p>}
      {s.message && <p role="status" className="msg-ok text-sm font-medium">{s.message}</p>}
      <Button type="submit" loading={pending}>Send invitation</Button>
    </form>
  );
}
