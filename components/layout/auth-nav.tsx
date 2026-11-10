"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function AuthNav() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [unread, setUnread] = useState(0); // number of PEOPLE with unread messages, not messages
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        supabase.rpc("unread_chat_count").then(({ data }) => setUnread(typeof data === "number" ? data : 0));
      }, 150);
    };

    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
      if (!data.session) return;
      refresh();
      // New or read messages anywhere update the badge straight away (row-level security limits this to your own chats)
      channel = supabase.channel("unread-badge")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, refresh)
        .subscribe();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { setSignedIn(Boolean(session)); if (session) refresh(); else setUnread(0); });

    window.addEventListener("focus", refresh);
    window.addEventListener("erent:unread-changed", refresh);
    const poll = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 60000); // safety net if realtime drops
    return () => {
      clearTimeout(timer); clearInterval(poll); sub.subscription.unsubscribe();
      window.removeEventListener("focus", refresh); window.removeEventListener("erent:unread-changed", refresh);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => { window.dispatchEvent(new Event("erent:unread-changed")); }, [pathname]);

  if (signedIn) {
    const label = unread > 99 ? "99+" : String(unread);
    return (
      <>
        <Button asChild variant="ghost">
          <Link href="/chats" aria-label={unread > 0 ? `Chats, ${unread} ${unread === 1 ? "person has" : "people have"} sent you messages` : "Chats"}>
            Chats{unread > 0 && <span aria-hidden className="ml-1 rounded-full bg-primary px-2 text-xs text-primary-foreground">{label}</span>}
          </Link>
        </Button>
        <Button asChild variant="secondary"><Link href="/account">Account</Link></Button>
      </>
    );
  }
  return <Button asChild><Link href="/sign-in">Sign in</Link></Button>;
}
