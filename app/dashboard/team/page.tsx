import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { InviteForm } from "@/components/team/invite-form";
import { InviteOrgForm } from "@/components/org/org-forms";
import { revokeDelegation } from "./actions";

export const metadata = { title: "Caretakers and agents" };

const STATUS: Record<string, string> = { invited: "Invited", active: "Active", revoked: "Revoked" };

export default async function TeamPage() {
  const a = await getAccess("/dashboard/team");
  const supabase = await createClient();
  const [mine, serving] = await Promise.all([
    supabase.rpc("landlord_team"),
    supabase.rpc("my_landlords"),
  ]);
  const team = (mine.data ?? []) as { id: string; label: string; kind: string; status: string; is_org: boolean }[];
  const landlords = (serving.data ?? []) as { landlord_id: string; display_name: string; kind: string }[];

  return (
    <div className="max-w-3xl space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Caretakers and agents</h1>
        <p className="max-w-xl text-muted">A caretaker or agent can post houses for you, but nothing goes live until you approve it, and you can remove their access at any time.</p>
      </header>

      {a.isLandlord && (
        <>
          <section aria-labelledby="inv" className="space-y-4"><h2 id="inv" className="text-xl font-semibold">Invite someone</h2><InviteForm /></section>
          <section aria-labelledby="orginv" className="space-y-4"><h2 id="orginv" className="text-xl font-semibold">Hand your properties to an organisation</h2><p className="max-w-xl text-sm text-muted">If a property management company looks after your houses, enter the code they gave you. Their team can then post and manage houses for you. You still approve every listing.</p><InviteOrgForm /></section>
          <section aria-labelledby="list" className="space-y-3">
            <h2 id="list" className="text-xl font-semibold">Your team</h2>
            {!team.length ? <p className="text-muted">Nobody yet.</p> : (
              <ul className="divide-y divide-border rounded-[20px] border border-border bg-surface">
                {team.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-4 p-4">
                    <span><span className="font-medium">{d.label}</span><span className="ml-2 text-sm text-muted">{d.is_org ? "Organisation" : <span className="capitalize">{d.kind}</span>} · {STATUS[d.status]}</span></span>
                    <form action={revokeDelegation.bind(null, d.id)}><Button type="submit" variant="ghost">{d.status === "invited" ? "Cancel" : "Remove access"}</Button></form>
                  </li>))}
              </ul>)}
          </section>
        </>
      )}

      {landlords.length > 0 && (
        <section aria-labelledby="serve" className="space-y-3">
          <h2 id="serve" className="text-xl font-semibold">You post for</h2>
          <ul className="divide-y divide-border rounded-[20px] border border-border bg-surface">
            {landlords.map((l) => <li key={l.landlord_id} className="p-4"><span className="font-medium">{l.display_name || "A landlord"}</span><span className="ml-2 text-sm capitalize text-muted">{l.kind}</span></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
