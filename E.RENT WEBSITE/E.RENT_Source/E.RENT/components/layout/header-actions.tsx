"use client";

import Link from "next/link";
import { MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "./account-menu";
import { ThemeMenu } from "./theme-menu";
import { NotificationBell } from "./notification-bell";
import { useSession } from "./session-provider";

/** Where the landlord button goes depends on who is looking: visitors sign up as landlords, landlords add a house, tenants learn about becoming one. */
export function useLandlordHref() {
  const s = useSession();
  if (s.status !== "in") return "/sign-up?role=landlord";
  return s.roles.some((r) => ["landlord", "agent", "organization"].includes(r)) ? "/dashboard/listings/new" : "/for-landlords";
}

export function HeaderActions() {
  const s = useSession();
  const landlordHref = useLandlordHref();
  return (
    <div className="ml-auto flex items-center gap-1">
      <Button asChild variant="ghost" size="icon" className="lg:hidden"><Link href="/search" aria-label="Search"><Search className="size-5" aria-hidden /></Link></Button>
      <ThemeMenu />
      {s.status === "in" && <NotificationBell />}
      <Button asChild className="hidden md:inline-flex"><Link href={landlordHref}>For Landlords</Link></Button>
      {s.status === "in" ? (
        <>
          <Button asChild variant="ghost" className="relative hidden md:inline-flex">
            <Link href="/chats" aria-label={s.unread > 0 ? `Chats, ${s.unread} ${s.unread === 1 ? "person has" : "people have"} sent you messages` : "Chats"}>
              <MessageCircle className="size-5" aria-hidden />Chats
              {s.unread > 0 && <span aria-hidden className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">{s.unread > 99 ? "99+" : s.unread}</span>}
            </Link>
          </Button>
          <AccountMenu />
        </>
      ) : s.status === "out" ? (
        <Button asChild variant="secondary"><Link href="/sign-in">Sign in</Link></Button>
      ) : <div className="size-11" aria-hidden />}
    </div>
  );
}
