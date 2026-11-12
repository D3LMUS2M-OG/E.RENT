"use client";

import Link from "next/link";
import { MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "./account-menu";
import { useSession } from "./session-provider";

export function HeaderActions() {
  const s = useSession();
  return (
    <div className="ml-auto flex items-center gap-1.5">
      <Button asChild variant="ghost" size="icon" className="md:hidden"><Link href="/search" aria-label="Search"><Search className="size-5" aria-hidden /></Link></Button>
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
        <Button asChild><Link href="/sign-in">Sign in</Link></Button>
      ) : <div className="size-11" aria-hidden />}
    </div>
  );
}
