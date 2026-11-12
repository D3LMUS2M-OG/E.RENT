import Link from "next/link";
import type { Metadata } from "next";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { AreaShell, type AreaItem } from "@/components/layout/area-shell";
import { Notices } from "@/components/account/notices";
import { addLandlordRole } from "./actions";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const access = await getAccess("/dashboard");

  if (access.landlordIds.length === 0 && access.orgIds.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-4xl">List a house on E.Rent</h1>
        <p className="mt-3 text-muted">Add the landlord role to your account to post houses. You can still search and chat as a tenant.</p>
        <form action={addLandlordRole} className="mt-6"><Button size="lg" type="submit">Add landlord role</Button></form>
        <p className="mt-6 text-sm text-muted">Run a property management company? <Link className="text-link underline underline-offset-4" href="/org">Set up an organisation</Link>.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: inc } = await supabase.rpc("incoming_requests");
  const waiting = ((inc ?? []) as { status: string }[]).filter((r) => r.status === "pending").length;
  const items: AreaItem[] = [
    { href: "/dashboard", label: "Overview", icon: "overview", exact: true },
    { href: "/dashboard/listings", label: "My listings", icon: "listings", exact: true },
    { href: "/dashboard/listings/new", label: "Add a house", icon: "add" },
    { href: "/dashboard/requests", label: "Requests", icon: "requests", badge: waiting },
    { href: "/chats", label: "Chats", icon: "chats", chatsBadge: true },
    { href: "/dashboard/verification", label: "Verification", icon: "verify" },
    { href: "/dashboard/team", label: "Caretakers", icon: "team" },
    { href: "/org", label: "Organisation", icon: "org" },
  ];
  return <AreaShell items={items}><Notices />{children}</AreaShell>;
}
