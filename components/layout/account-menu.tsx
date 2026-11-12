"use client";

import Link from "next/link";
import { LayoutDashboard, LogOut, MessageCircle, ShieldCheck, UserRound, Building2, Heart, ClipboardList } from "lucide-react";
import { PopoverMenu } from "@/components/ui/popover-menu";
import { ThemeToggle } from "./theme-toggle";
import { useSession } from "./session-provider";
import { signOut } from "@/app/(auth)/actions";

const initials = (n: string) => (n.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("") || "·").toUpperCase();

export function AccountMenu() {
  const s = useSession();
  const landlordLike = s.roles.some((r) => ["landlord", "agent", "organization"].includes(r));
  const links = [
    ...(landlordLike ? [[LayoutDashboard, "Dashboard", "/dashboard"], [ClipboardList, "Requests", "/dashboard/requests"]] as const : []),
    ...(s.roles.includes("organization") || s.roles.includes("agent") ? [[Building2, "Organisation", "/org"]] as const : []),
    [Heart, "Saved houses", "/saved"], [ClipboardList, "My requests", "/account/requests"], [MessageCircle, "Chats", "/chats"], [UserRound, "Account and settings", "/account"],
    ...(s.staff.length ? [[ShieldCheck, "Admin", "/admin"]] as const : []),
  ] as const;

  return (
    <PopoverMenu ariaLabel="Account menu" className="size-11 justify-center !px-0 font-semibold" label={<span aria-hidden>{initials(s.name)}</span>}>
      {(close) => (
        <>
          <div className="space-y-2">
            <p className="font-semibold">{s.name || "Your account"}</p>
            <ul className="flex flex-wrap gap-1.5">{s.roles.concat(s.staff.map((x) => `staff: ${x.replace("_", " ")}`)).map((r) => <li key={r} className="rounded-full border border-border px-2.5 py-0.5 text-xs capitalize text-muted">{r}</li>)}</ul>
          </div>
          <ul className="space-y-0.5 border-t border-border pt-2">
            {links.map(([Icon, label, href]) => (
              <li key={href}><Link href={href} onClick={close} className="flex min-h-11 items-center gap-3 rounded-[14px] px-3 text-[15px] hover:bg-surface-2"><Icon className="size-5 text-muted" aria-hidden />{label}</Link></li>))}
          </ul>
          <div className="space-y-2 border-t border-border pt-3"><p className="text-sm text-muted">Theme</p><ThemeToggle /></div>
          <form action={signOut} className="border-t border-border pt-2">
            <button type="submit" className="flex min-h-11 w-full items-center gap-3 rounded-[14px] px-3 text-[15px] hover:bg-surface-2"><LogOut className="size-5 text-muted" aria-hidden />Sign out</button>
          </form>
        </>
      )}
    </PopoverMenu>
  );
}
