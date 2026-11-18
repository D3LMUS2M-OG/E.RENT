"use client";

import Link from "next/link";
import { LayoutDashboard, LogOut, MessageCircle, ShieldCheck, UserRound, Building2, Heart, ClipboardList, ChevronRight } from "lucide-react";
import { PopoverMenu } from "@/components/ui/popover-menu";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/tag";
import { ThemeToggle } from "./theme-toggle";
import { useSession } from "./session-provider";
import { signOut } from "@/app/(auth)/actions";

export function AccountMenu() {
  const s = useSession();
  const landlordLike = s.roles.some((r) => ["landlord", "agent", "organization"].includes(r));
  const links = [
    ...(landlordLike ? [[LayoutDashboard, "Dashboard", "/dashboard"], [ClipboardList, "Incoming requests", "/dashboard/requests"]] as const : []),
    ...(s.roles.includes("organization") || s.roles.includes("agent") ? [[Building2, "Organisation", "/org"]] as const : []),
    [Heart, "Saved houses", "/saved"], [ClipboardList, "My requests", landlordLike ? "/dashboard/my-requests" : "/account/requests"], [MessageCircle, "Chats", "/chats"], [UserRound, "Account and settings", "/account"],
    ...(s.staff.length ? [[ShieldCheck, "Admin", "/admin"]] as const : []),
  ] as const;

  return (
    <PopoverMenu ariaLabel="Account menu" className="size-11 justify-center overflow-hidden !rounded-full !border-0 !p-0 shadow-[var(--shadow-btn)] ring-1 ring-border-strong"
      label={<Avatar name={s.name} path={s.avatarUrl} className="size-11" />}>
      {(close) => (
        <>
          <div className="flex items-center gap-3">
            <Avatar name={s.name} path={s.avatarUrl} className="size-14 text-lg" />
            <div className="min-w-0 space-y-1.5">
              <p className="truncate font-semibold">{s.name || "Your account"}</p>
              <ul className="flex flex-wrap gap-1">{s.roles.map((r) => <li key={r}><Tag>{r}</Tag></li>)}{s.staff.map((r) => <li key={r}><Tag>Staff: {r.replace("_", " ")}</Tag></li>)}</ul>
            </div>
          </div>
          <ul className="space-y-1 border-t border-border pt-3">
            {links.map(([Icon, label, href]) => (
              <li key={href}><Link href={href} onClick={close} className="flex min-h-11 items-center gap-3 rounded-[14px] border border-border bg-surface-2 px-3 text-[15px] font-medium shadow-[var(--shadow-btn)] transition-colors hover:border-foreground/40 active:translate-y-px active:shadow-none">
                <Icon className="size-5 text-accent" aria-hidden />{label}<ChevronRight className="ml-auto size-4 text-muted" aria-hidden /></Link></li>))}
          </ul>
          <div className="space-y-2 border-t border-border pt-3"><p className="text-sm font-medium">Theme</p><ThemeToggle /></div>
          <form action={signOut} className="border-t border-border pt-3">
            <button type="submit" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-danger/60 px-4 text-[15px] font-semibold text-danger transition-colors hover:bg-danger/10"><LogOut className="size-5" aria-hidden />Sign out</button>
          </form>
        </>
      )}
    </PopoverMenu>
  );
}
