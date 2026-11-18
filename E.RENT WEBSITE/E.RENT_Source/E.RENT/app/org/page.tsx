import Link from "next/link";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { CreateOrgForm, InviteMemberForm } from "@/components/org/org-forms";
import { removeMember, revokeInvite, setOrgDelegation } from "./actions";

type Member = { user_id: string; full_name: string; member_role: string };
type LandlordRow = { id: string; landlord_name: string; status: string; created_at: string };

export default async function OrgPage() {
  const a = await getAccess("/org");
  const supabase = await createClient();
  const { data: mem } = await supabase.from("organization_members").select("organization_id, member_role, org:organizations(id, name, slug)").eq("user_id", a.userId).limit(1);
  const mine = mem?.[0] as unknown as { organization_id: string; member_role: string; org: { id: string; name: string; slug: string } } | undefined;

  if (!mine) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Set up an organisation</h1>
        <p className="max-w-xl text-muted">For property management companies. Invite your team, then landlords hand their properties to your organisation and your team can post and manage houses for them. Landlords still approve every listing.</p>
        <CreateOrgForm />
      </div>
    );
  }

  const orgId = mine.organization_id; const isManager = ["owner", "manager"].includes(mine.member_role); const isOwner = mine.member_role === "owner";
  const [members, landlords, invites] = await Promise.all([
    supabase.rpc("org_members", { p_org: orgId }),
    supabase.rpc("org_landlords", { p_org: orgId }),
    isManager ? supabase.from("organization_invites").select("id, invited_email, member_role").eq("organization_id", orgId).eq("status", "invited") : Promise.resolve({ data: [] as { id: string; invited_email: string; member_role: string }[] }),
  ]);
  const ls = (landlords.data ?? []) as LandlordRow[];

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{mine.org.name}</h1>
        <p className="text-muted">Your role: <span className="font-medium capitalize text-foreground">{mine.member_role}</span></p>
        <p className="rounded-[20px] border border-border bg-surface p-4 text-sm">Organisation code: <strong className="select-all">{mine.org.slug}</strong><br />
          <span className="text-muted">A landlord enters this under Dashboard, Caretakers, to hand their properties to you.</span></p>
        {ls.some((l) => l.status === "active") && <Button asChild><Link href="/dashboard/listings/new">Add a house for a landlord</Link></Button>}
      </header>

      <section aria-labelledby="landlords" className="space-y-3">
        <h2 id="landlords" className="text-xl font-semibold">Landlords</h2>
        {ls.length === 0 ? <p className="text-muted">No landlord has handed you properties yet.</p> : (
          <ul className="divide-y divide-border rounded-[20px] border border-border bg-surface">
            {ls.map((l) => (
              <li key={l.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <span><span className="font-medium">{l.landlord_name || "A landlord"}</span><span className="ml-2 text-sm text-muted">{l.status === "invited" ? "Waiting for you" : "Active"}</span></span>
                {isManager && (l.status === "invited" ? (
                  <span className="flex gap-2">
                    <ActionButton action={setOrgDelegation.bind(null, l.id, "accept")}>Accept</ActionButton>
                    <ActionButton action={setOrgDelegation.bind(null, l.id, "decline")} variant="secondary">Decline</ActionButton>
                  </span>
                ) : <ActionButton action={setOrgDelegation.bind(null, l.id, "end")} variant="ghost" confirmText="Stop managing this landlord's properties?">End</ActionButton>)}
              </li>))}
          </ul>)}
      </section>

      <section aria-labelledby="team" className="space-y-3">
        <h2 id="team" className="text-xl font-semibold">Team</h2>
        <ul className="divide-y divide-border rounded-[20px] border border-border bg-surface">
          {((members.data ?? []) as Member[]).map((m) => (
            <li key={m.user_id} className="flex items-center justify-between gap-3 p-4">
              <span><span className="font-medium">{m.full_name || "Unnamed"}</span><span className="ml-2 text-sm capitalize text-muted">{m.member_role}</span></span>
              {m.member_role !== "owner" && (isManager || m.user_id === a.userId) && (
                <ActionButton action={removeMember.bind(null, orgId, m.user_id)} variant="ghost" confirmText={m.user_id === a.userId ? "Leave this organisation?" : "Remove this person?"}>{m.user_id === a.userId ? "Leave" : "Remove"}</ActionButton>)}
            </li>))}
        </ul>
        {isManager && (
          <>
            {(invites.data ?? []).length > 0 && (
              <ul className="divide-y divide-border rounded-[20px] border border-border bg-surface">
                {(invites.data ?? []).map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 p-4">
                    <span>{i.invited_email}<span className="ml-2 text-sm capitalize text-muted">{i.member_role} · invited</span></span>
                    <ActionButton action={revokeInvite.bind(null, i.id)} variant="ghost">Cancel</ActionButton>
                  </li>))}
              </ul>)}
            <div className="pt-4"><h3 className="mb-3 font-semibold">Invite someone</h3><InviteMemberForm orgId={orgId} isOwner={isOwner} /></div>
          </>)}
      </section>
    </div>
  );
}
