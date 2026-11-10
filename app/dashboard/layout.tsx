import Link from "next/link";
import type { Metadata } from "next";
import { getAccess } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { addLandlordRole } from "./actions";
import { Notices } from "@/components/account/notices";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const access = await getAccess("/dashboard");

  if (access.landlordIds.length === 0 && access.orgIds.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">List a house on E.Rent</h1>
        <p className="mt-3 text-muted">Add the landlord role to your account to post houses. You can still search and chat as a tenant.</p>
        <form action={addLandlordRole} className="mt-6"><Button size="lg" type="submit">Add landlord role</Button></form>
        <p className="mt-6 text-sm text-muted">Run a property management company? <Link className="underline underline-offset-4" href="/org">Set up an organisation</Link>.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="Dashboard" className="mb-8 flex gap-1 border-b border-border">
        <Button asChild variant="ghost"><Link href="/dashboard">Overview</Link></Button>
        <Button asChild variant="ghost"><Link href="/dashboard/listings">My listings</Link></Button>
        <Button asChild variant="ghost"><Link href="/dashboard/listings/new">Add a house</Link></Button>
        <Button asChild variant="ghost"><Link href="/dashboard/requests">Requests</Link></Button>
        <Button asChild variant="ghost"><Link href="/chats">Chats</Link></Button>
        <Button asChild variant="ghost"><Link href="/dashboard/verification">Verification</Link></Button>
        <Button asChild variant="ghost"><Link href="/dashboard/team">Caretakers</Link></Button>
        <Button asChild variant="ghost"><Link href="/org">Organisation</Link></Button>
      </nav>
      <Notices />
      {children}
    </div>
  );
}
