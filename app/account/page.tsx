import Link from "next/link";
import type { Metadata } from "next";
import { Building2, ChevronRight, ClipboardList, Heart, KeyRound, LayoutDashboard, LogOut, MessageCircle, ShieldCheck, UserPlus } from "lucide-react";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Notices } from "@/components/account/notices";
import { ProfileForm } from "@/components/account/profile-form";
import { AvatarUploader } from "@/components/account/avatar-uploader";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationPrefs } from "@/components/account/notification-prefs";
import { signOut } from "@/app/(auth)/actions";
import { addLandlordRole } from "@/app/dashboard/actions";
import { respondToInvitation } from "@/app/dashboard/team/actions";
import { respondOrgInvite } from "@/app/org/actions";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

const tile = "motion-rise group flex min-h-28 flex-col justify-between rounded-[22px] border border-border bg-surface p-4 shadow-[var(--shadow-btn)] transition-[transform,background-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:bg-surface-2 active:translate-y-px";
const card = "rounded-[24px] border border-border bg-surface p-5 sm:p-6";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const a = await getAccess("/account");
  const { password } = await searchParams;
  const supabase = await createClient();
  const [{ data: invites }, { data: orgInv }, { data: prof }, { data: ver }] = await Promise.all([
    supabase.rpc("my_invitations"),
    supabase.rpc("my_org_invites"),
    supabase.from("profiles").select("phone, avatar_url").eq("id", a.userId).maybeSingle(),
    supabase.from("landlord_verifications").select("status").eq("user_id", a.userId).maybeSingle(),
  ]);
  const pending = (invites ?? []) as { id: string; landlord_name: string; kind: string }[];
  const orgInvites = (orgInv ?? []) as { id: string; org_name: string; member_role: string }[];
  const landlordLike = a.landlordIds.length > 0;

  const shortcuts = [
    { href: "/saved", label: "Saved houses", hint: "Houses you liked", icon: Heart },
    { href: "/account/requests", label: "My requests", hint: "Viewings and applications", icon: ClipboardList },
    { href: "/chats", label: "Chats", hint: "Talk to landlords", icon: MessageCircle },
    ...(landlordLike ? [{ href: "/dashboard", label: "Dashboard", hint: "Your listings and requests", icon: LayoutDashboard }] : []),
    ...(a.orgIds.length > 0 ? [{ href: "/org", label: "Organisation", hint: "Team and landlords", icon: Building2 }] : []),
    ...(a.isStaff ? [{ href: "/admin", label: "Admin", hint: "Moderation and reviews", icon: ShieldCheck }] : []),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:py-10">
      <Notices />
      {password === "updated" && <p role="status" className="msg-ok rounded-[18px] border border-border bg-surface px-4 py-3 text-sm font-medium">Your password was changed.</p>}

      <section aria-label="Your profile" className={`${card} flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left`}>
        <AvatarUploader userId={a.userId} name={a.fullName} path={prof?.avatar_url ?? null} />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h1 className="text-[34px] leading-tight sm:text-4xl">{a.fullName || "Your account"}</h1>
            <p className="mt-1 break-all text-muted">{a.email}</p>
          </div>
          <ul className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {a.roles.map((r) => <li key={r}><Tag>{r}</Tag></li>)}
            {a.staffRoles.map((r) => <li key={r}><Tag>Staff: {r.replace("_", " ")}</Tag></li>)}
            {ver?.status === "approved" && <li><VerifiedBadge /></li>}
          </ul>
        </div>
      </section>

      {(pending.length > 0 || orgInvites.length > 0) && (
        <section aria-labelledby="inv" className={`${card} space-y-3`}>
          <h2 id="inv" className="text-2xl">Invitations</h2>
          <ul className="divide-y divide-border">
            {pending.map((i) => (
              <li key={i.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span><span className="font-medium">{i.landlord_name || "A landlord"}</span> invited you to post houses for them as a <span className="capitalize">{i.kind}</span>.</span>
                <span className="flex gap-2"><form action={respondToInvitation.bind(null, i.id, true)}><Button type="submit">Accept</Button></form><form action={respondToInvitation.bind(null, i.id, false)}><Button type="submit" variant="secondary">Decline</Button></form></span>
              </li>))}
            {orgInvites.map((i) => (
              <li key={i.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span><span className="font-medium">{i.org_name}</span> invited you to join their team as a {i.member_role}.</span>
                <span className="flex gap-2"><form action={respondOrgInvite.bind(null, i.id, true)}><Button type="submit">Accept</Button></form><form action={respondOrgInvite.bind(null, i.id, false)}><Button type="submit" variant="secondary">Decline</Button></form></span>
              </li>))}
          </ul>
        </section>
      )}

      <section aria-label="Shortcuts" className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {shortcuts.map(({ href, label, hint, icon: Icon }) => (
          <Link key={href} href={href} className={tile}>
            <Icon className="size-6 text-accent" aria-hidden />
            <span className="flex items-end justify-between gap-2"><span><b className="block text-[17px]">{label}</b><span className="text-[13px] text-muted">{hint}</span></span><ChevronRight className="mb-1 size-5 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden /></span>
          </Link>))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section id="phone" aria-labelledby="details" className={`${card} space-y-4`}>
          <h2 id="details" className="text-2xl">Your details</h2>
          <ProfileForm fullName={a.fullName} phone={prof?.phone ?? null} />
        </section>

        <div className="space-y-6">
          <section aria-labelledby="notif" className={`${card} space-y-3`}><h2 id="notif" className="text-2xl">Notifications</h2><NotificationPrefs /></section>
          <section aria-labelledby="look" className={`${card} space-y-3`}><h2 id="look" className="text-2xl">Appearance</h2><ThemeToggle /></section>

          <section aria-labelledby="sec" className={`${card} space-y-3`}>
            <h2 id="sec" className="text-2xl">Security</h2>
            <Button asChild variant="secondary" className="w-full justify-start"><Link href="/reset-password"><KeyRound className="size-4" aria-hidden />Change password</Link></Button>
          </section>

          <section aria-labelledby="roles" className={`${card} space-y-3`}>
            <h2 id="roles" className="text-2xl">Your roles</h2>
            <p className="text-sm text-muted">One account can be a tenant, a landlord, or both.</p>
            {!a.isLandlord && <form action={addLandlordRole}><Button type="submit" variant="secondary" className="w-full justify-start"><UserPlus className="size-4" aria-hidden />Add landlord role</Button></form>}
            {a.orgIds.length === 0 && <Button asChild variant="secondary" className="w-full justify-start"><Link href="/org"><Building2 className="size-4" aria-hidden />Set up an organisation</Link></Button>}
          </section>
        </div>
      </div>

      <form action={signOut} className="flex justify-center pt-2">
        <button type="submit" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-danger/60 px-6 text-[15px] font-semibold text-danger transition-colors hover:bg-danger/10"><LogOut className="size-5" aria-hidden />Sign out</button>
      </form>
    </div>
  );
}
