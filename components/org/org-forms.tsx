"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { createOrganization, inviteMember, inviteOrganization } from "@/app/org/actions";
import type { ActionState } from "@/app/dashboard/actions";

const sel = "min-h-11 w-full rounded-md border border-border-strong bg-background px-3 text-base";
function Status({ s }: { s: ActionState }) {
  return <>{s.error && <p role="alert" className="text-sm font-medium">Error: {s.error}</p>}{s.message && <p role="status" className="text-sm font-medium">{s.message}</p>}</>;
}

export function CreateOrgForm() {
  const [s, action, pending] = useActionState(createOrganization, {} as ActionState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Organisation name" htmlFor="org-name"><Input id="org-name" name="name" placeholder="Acme Property Management" /></Field>
      <Status s={s} /><Button type="submit" size="lg" loading={pending}>Create organisation</Button>
    </form>
  );
}

export function InviteMemberForm({ orgId, isOwner }: { orgId: string; isOwner: boolean }) {
  const [s, action, pending] = useActionState(inviteMember.bind(null, orgId), {} as ActionState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label="Their email address" htmlFor="member-email"><Input id="member-email" name="email" type="email" autoComplete="off" /></Field>
        <Field label="Role" htmlFor="member-role">
          <select id="member-role" name="role" className={sel}><option value="member">Member</option>{isOwner && <option value="manager">Manager</option>}</select>
        </Field>
      </div>
      <Status s={s} /><Button type="submit" loading={pending}>Send invitation</Button>
    </form>
  );
}

export function InviteOrgForm() {
  const [s, action, pending] = useActionState(inviteOrganization, {} as ActionState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Organisation code" htmlFor="org-code"><Input id="org-code" name="code" placeholder="acme-property-management" autoCapitalize="none" /></Field>
      <Status s={s} /><Button type="submit" variant="secondary" loading={pending}>Hand my properties to this organisation</Button>
    </form>
  );
}
