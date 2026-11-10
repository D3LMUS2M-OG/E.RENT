import Link from "next/link";
import type { Metadata } from "next";
import { getAccess } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(auth)/actions";
import { addLandlordRole } from "@/app/dashboard/actions";
import { respondToInvitation } from "@/app/dashboard/team/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage() {
  const a = await getAccess("/account");
  const supabase = await createClient();
  const { data: invites } = await supabase.rpc("my_invitations");
  const pending = (invites ?? []) as { id: string; landlord_name: string; kind: string }[];
  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{a.fullName || "Your account"}</h1>
        <p className="mt-1 text-muted">{a.email}</p>
      </header>

      {pending.length > 0 && (
        <section aria-labelledby="inv" className="space-y-3">
          <h2 id="inv" className="text-xl font-semibold">Invitations</h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {pending.map((i) => (
              <li key={i.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <span><span className="font-medium">{i.landlord_name || "A landlord"}</span> invited you to post houses for them as a <span className="capitalize">{i.kind}</span>.</span>
                <span className="flex gap-2">
                  <form action={respondToInvitation.bind(null, i.id, true)}><Button type="submit">Accept</Button></form>
                  <form action={respondToInvitation.bind(null, i.id, false)}><Button type="submit" variant="secondary">Decline</Button></form>
                </span>
              </li>))}
          </ul>
        </section>
      )}

      <section aria-labelledby="roles" className="space-y-3">
        <h2 id="roles" className="text-xl font-semibold">Your roles</h2>
        <ul className="flex flex-wrap gap-2">
          {a.roles.length === 0 && <li className="text-muted">No roles yet. Run the backfill script in supabase/scripts.</li>}
          {a.roles.map((r) => <li key={r} className="rounded-md border border-border-strong px-3 py-1 text-sm font-medium capitalize">{r}</li>)}
          {a.staffRoles.map((r) => <li key={r} className="rounded-md bg-primary px-3 py-1 text-sm font-medium capitalize text-primary-foreground">Staff: {r.replace("_", " ")}</li>)}
        </ul>
        {!a.isLandlord && (
          <form action={addLandlordRole}><Button variant="secondary" type="submit">Add landlord role</Button></form>
        )}
      </section>

      <section aria-labelledby="go" className="space-y-3">
        <h2 id="go" className="text-xl font-semibold">Go to</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary"><Link href="/search">Search houses</Link></Button>
          <Button asChild variant="secondary"><Link href="/account/requests">My requests</Link></Button>
          {a.landlordIds.length > 0 && <Button asChild variant="secondary"><Link href="/dashboard">Landlord dashboard</Link></Button>}
          {a.isStaff && <Button asChild><Link href="/admin">Admin</Link></Button>}
        </div>
      </section>

      <form action={signOut}><Button variant="ghost" type="submit">Sign out</Button></form>
    </div>
  );
}
