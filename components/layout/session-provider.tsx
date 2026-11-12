"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Session = { status: "loading" | "out" | "in"; userId?: string; name: string; roles: string[]; staff: string[]; unread: number };
const initial: Session = { status: "loading", name: "", roles: [], staff: [], unread: 0 };
const Ctx = createContext<Session>(initial);
export const useSession = () => useContext(Ctx);

/** One place that knows who is signed in, their roles and the number of people with unread messages. */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<Session>(initial);
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let uid: string | undefined;

    const refreshUnread = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!uid) return;
        supabase.rpc("unread_chat_count").then(({ data }) => setS((p) => ({ ...p, unread: typeof data === "number" ? data : 0 })));
      }, 150);
    };

    const load = async (userId: string | undefined) => {
      uid = userId;
      if (channel) { supabase.removeChannel(channel); channel = undefined; }
      if (!userId) { setS({ ...initial, status: "out" }); return; }
      const [p, r, st] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("staff_roles").select("role").eq("user_id", userId),
      ]);
      setS({ status: "in", userId, name: p.data?.full_name ?? "", roles: (r.data ?? []).map((x) => x.role as string), staff: (st.data ?? []).map((x) => x.role as string), unread: 0 });
      refreshUnread();
      channel = supabase.channel("session-unread")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refreshUnread)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, refreshUnread)
        .subscribe();
    };

    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session?.user.id !== uid) load(session?.user.id); });
    window.addEventListener("focus", refreshUnread);
    window.addEventListener("erent:unread-changed", refreshUnread);
    const poll = setInterval(() => { if (document.visibilityState === "visible") refreshUnread(); }, 60000); // safety net if realtime drops
    return () => {
      clearTimeout(timer); clearInterval(poll); sub.subscription.unsubscribe();
      window.removeEventListener("focus", refreshUnread); window.removeEventListener("erent:unread-changed", refreshUnread);
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => { window.dispatchEvent(new Event("erent:unread-changed")); }, [pathname]);
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}
