import { notFound } from "next/navigation";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionButton } from "@/components/ui/action-button";
import { AddStaffForm } from "@/components/admin/add-staff-form";
import { removeStaff } from "./actions";

export const metadata = { title: "Staff" };
type Person = { user_id: string; email: string; full_name: string; roles: string[] };

export default async function StaffPage() {
  const a = await getAccess("/admin/staff");
  if (!a.isSuperAdmin) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_list");
  const people = (data ?? []) as Person[];
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl">Staff</h1><p className="mt-1 max-w-prose text-muted">The team and what each person can do. Roles are checked in the database, not just on screen. Two-factor sign-in is recommended for every staff account.</p></div>
      <AddStaffForm />
      <ul className="space-y-2">{people.map((p) => (
        <li key={p.user_id} className="rounded-[20px] border border-border bg-surface p-4">
          <p className="font-semibold">{p.full_name || p.email}</p>{p.full_name && <p className="text-sm text-muted">{p.email}</p>}
          <ul className="mt-2 flex flex-wrap gap-2">{p.roles.map((r) => (
            <li key={r} className="inline-flex items-center gap-1 rounded-full border border-border-strong py-0.5 pl-3 pr-0.5 text-sm">{r.replace("_", " ")}
              <ActionButton variant="ghost" aria-label={`Remove ${r} from ${p.email}`} action={removeStaff.bind(null, p.user_id, r)} confirmText={`Remove the ${r.replace("_", " ")} role from ${p.email}?`}>Remove</ActionButton></li>))}</ul></li>))}</ul>
    </div>
  );
}
