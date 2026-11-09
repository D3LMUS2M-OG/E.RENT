import Link from "next/link";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHome() {
  const a = await getAccess("/admin");
  const supabase = await createClient();
  const [flags, active, taken, users] = await Promise.all([
    supabase.from("listing_flags").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "taken_down"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  const stats = [
    ["Open flags", flags.count ?? 0, "/admin/moderation"], ["Live listings", active.count ?? 0, "/admin/moderation"],
    ["Taken down", taken.count ?? 0, "/admin/moderation"], ["Profiles you can see", users.count ?? 0, null],
  ] as const;
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-muted">Signed in as {a.email}. Roles: {a.staffRoles.map((r) => r.replace("_", " ")).join(", ")}.</p>
      </header>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, n, href]) => (
          <div key={label} className="rounded-lg border border-border p-4">
            <dt className="text-sm text-muted">{href ? <Link className="underline-offset-4 hover:underline" href={href}>{label}</Link> : label}</dt>
            <dd className="mt-1 text-3xl font-semibold">{n}</dd>
          </div>
        ))}
      </dl>
      <p className="max-w-xl text-sm text-muted">Verification, reports, reviews, users, data, flags, staff and the audit log screens arrive with their steps. Every action taken here is already written to the audit log table.</p>
    </div>
  );
}
