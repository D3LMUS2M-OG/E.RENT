import Link from "next/link";
import type { Metadata } from "next";
import { getAccess } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(auth)/actions";
import { addLandlordRole } from "@/app/dashboard/actions";
import { respondToInvitation } from "@/app/dashboard/team/actions";
import { createClient } from "@/lib/supabase/server";
import { Notices } from "@/components/account/notices";
import { ProfileForm } from "@/components/account/profile-form";
import { respondOrgInvite } from "@/app/org/actions";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage() {
  const a = await getAccess("/account");
  const supabase = await createClient();
  const { data: invites } = await supabase.rpc("my_invitations");
  const pending = (invites ?? []) as { id: string; landlord_name: string; kind: string }[];
  const { data: orgInv } = await supabase.rpc("my_org_invites");
  const orgInvites = (orgInv ?? []) as { id: string; org_name: string; member_role: string }[];
  const { data: prof } = await supabase.from("profiles").select("phone").eq("id", a.userId).maybeSingle();
  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{a.fullName || "Your account"}</h1>
        <p className="mt-1 text-muted">{a.email}</p>
      </header>

      <Notices />

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

      {orgInvites.length > 0 && (
        <section aria-labelledby="orginv" className="space-y-3">
          <h2 id="orginv" className="text-xl font-semibold">Organisation invitations</h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {orgInvites.map((i) => (
              <li key={i.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <span><span className="font-medium">{i.org_name}</span> invited you to join their team as a {i.member_role}.</span>
                <span className="flex gap-2">
                  <form action={respondOrgInvite.bind(null, i.id, true)}><Button type="submit">Accept</Button></form>
                  <form action={respondOrgInvite.bind(null, i.id, false)}><Button type="submit" variant="secondary">Decline</Button></form>
                </span>
              </li>))}
          </ul>
        </section>
      )}

      <section id="phone" aria-labelledby="profile" className="space-y-3">
        <h2 id="profile" className="text-xl font-semibold">Your details</h2>
        <ProfileForm fullName={a.fullName} phone={prof?.phone ?? null} />
      </section>

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
        {a.orgIds.length === 0 && <Button asChild variant="ghost"><Link href="/org">Set up an organisation</Link></Button>}
      </section>

      <section aria-labelledby="go" className="space-y-3">
        <h2 id="go" className="text-xl font-semibold">Go to</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary"><Link href="/search">Search houses</Link></Button>
          <Button asChild variant="secondary"><Link href="/account/requests">My requests</Link></Button>
          <Button asChild variant="secondary"><Link href="/chats">Chats</Link></Button>
          {a.landlordIds.length > 0 && <Button asChild variant="secondary"><Link href="/dashboard">Landlord dashboard</Link></Button>}
          {a.orgIds.length > 0 && <Button asChild variant="secondary"><Link href="/org">Organisation</Link></Button>}
          {a.isStaff && <Button asChild><Link href="/admin">Admin</Link></Button>}
        </div>
      </section>

      <form action={signOut}><Button variant="ghost" type="submit">Sign out</Button></form>
    </div>
  );
}
