"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { updateProfile } from "@/app/account/actions";
import type { ActionState } from "@/app/dashboard/actions";

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string | null }) {
  const [s, action, pending] = useActionState(updateProfile, {} as ActionState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Full name" htmlFor="full_name"><Input id="full_name" name="full_name" autoComplete="name" defaultValue={fullName} /></Field>
      <Field label="Phone number (optional)" htmlFor="phone"><Input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="0712 345 678" defaultValue={phone ?? ""} /></Field>
      <p className="text-sm text-muted">Your number stays hidden. It is shown to one person only after you approve sharing it.</p>
      {s.error && <p role="alert" className="text-sm font-medium">Error: {s.error}</p>}
      {s.message && <p role="status" className="text-sm font-medium">{s.message}</p>}
      <Button type="submit" loading={pending}>Save</Button>
    </form>
  );
}
