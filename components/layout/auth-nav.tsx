"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function AuthNav() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    const refreshUnread = () => supabase.rpc("unread_chat_count").then(({ data: n }) => setUnread(typeof n === "number" ? n : 0));
    supabase.auth.getSession().then(({ data: d }) => { if (d.session) refreshUnread(); });
    window.addEventListener("focus", refreshUnread);
    const timer = setInterval(() => { if (document.visibilityState === "visible") refreshUnread(); }, 60000);
    return () => { data.subscription.unsubscribe(); window.removeEventListener("focus", refreshUnread); clearInterval(timer); };
  }, []);

  if (signedIn) return (
    <>
      <Button asChild variant="ghost"><Link href="/chats">Chats{unread > 0 && <span className="ml-1 rounded-full bg-primary px-2 text-xs text-primary-foreground" aria-label={`${unread} unread`}>{unread}</span>}</Link></Button>
      <Button asChild variant="secondary"><Link href="/account">Account</Link></Button>
    </>
  );
  return <Button asChild><Link href="/sign-in">Sign in</Link></Button>;
}
