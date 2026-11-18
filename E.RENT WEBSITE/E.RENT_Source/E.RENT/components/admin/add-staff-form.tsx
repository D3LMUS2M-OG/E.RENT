"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { addStaff, type StaffState } from "@/app/admin/staff/actions";

const ROLES = [["moderator", "Moderator: takes down listings, handles reports"], ["verifier", "Verifier: approves landlords"], ["support", "Support: helps users"], ["analyst", "Analyst: reads analytics"], ["super_admin", "Super admin: everything"]];

export function AddStaffForm() {
  const [state, action, pending] = useActionState<StaffState, FormData>(addStaff, {});
  return (
    <form action={action} className="space-y-3 rounded-[20px] border border-border bg-surface p-5">
      <h2 className="text-xl">Add a team member</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1"><label htmlFor="email" className="text-sm font-medium">Their email (they must already have an account)</label><input id="email" name="email" type="email" required className="min-h-11 w-full rounded-[14px] border border-border-strong bg-background/60 px-3.5" /></div>
        <div className="space-y-1"><label htmlFor="role" className="text-sm font-medium">Role</label><select id="role" name="role" className="min-h-11 w-full rounded-[14px] border border-border-strong bg-background/60 px-3">{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <Button type="submit" loading={pending}>Add</Button>
      </div>
      {state.error && <p role="alert" className="text-sm font-medium">Error: {state.error}</p>}
      {state.ok && <p role="status" className="text-sm font-medium">Added. They get the role the next time they sign in.</p>}
    </form>
  );
}
