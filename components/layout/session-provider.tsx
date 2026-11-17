"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Session = { status: "loading" | "out" | "in"; userId?: string; name: string; avatarUrl: string | null; roles: string[]; staff: string[]; unread: number };
const initial: Session = { status: "loading", name: "", avatarUrl: null, roles: [], staff: [], unread: 0 };
const Ctx = createContext<Session>(initial);
export const useSession = () => useContext(Ctx);

const HINT = "erent-session";
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** One place that knows who is signed in, their roles, picture and the number of people with unread messages.
 *  A small hint is kept on the device so a signed-in person never sees "Sign in" flash while the session loads. */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<Session>(initial);
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const resync = useRef<() => void>(() => {});

  // Before the first paint: trust the hint. No hint means we simply wait for the real answer (nothing is drawn meanwhile).
  useIsoLayoutEffect(() => {
    try {
      const raw = localStorage.getItem(HINT);
      if (raw) { const h = JSON.parse(raw); setS({ status: "in", userId: h.userId, name: h.name ?? "", avatarUrl: h.avatarUrl ?? null, roles: h.roles ?? [], staff: h.staff ?? [], unread: 0 }); }
    } catch {}
  }, []);

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

    const load = async (userId: string | undefined, resubscribe = true) => {
      uid = userId;
      if (resubscribe && channel) { supabase.removeChannel(channel); channel = undefined; }
      if (!userId) { try { localStorage.removeItem(HINT); } catch {} setS({ ...initial, status: "out" }); return; }
      const [p, r, st] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("staff_roles").select("role").eq("user_id", userId),
      ]);
      const next = { name: p.data?.full_name ?? "", avatarUrl: (p.data?.avatar_url as string | null) ?? null, roles: (r.data ?? []).map((x) => x.role as string), staff: (st.data ?? []).map((x) => x.role as string) };
      setS((prev) => ({ ...prev, status: "in", userId, ...next }));
      try { localStorage.setItem(HINT, JSON.stringify({ userId, ...next })); } catch {}
      refreshUnread();
      if (resubscribe) {
        channel = supabase.channel("session-unread")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refreshUnread)
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, refreshUnread)
          .subscribe();
      }
    };

    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id));
    // Sign-in and sign-out happen in server actions, which change the cookie without the browser client noticing. Re-read it whenever the page changes or comes back into view.
    resync.current = () => { supabase.auth.getSession().then(({ data }) => { if (data.session?.user.id !== uid) load(data.session?.user.id); }); };
    const onShow = () => { if (document.visibilityState === "visible") resync.current(); };
    document.addEventListener("visibilitychange", onShow); window.addEventListener("pageshow", onShow);
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session?.user.id !== uid) load(session?.user.id); });
    const onProfile = () => { if (uid) load(uid, false); };
    window.addEventListener("focus", refreshUnread);
    window.addEventListener("erent:unread-changed", refreshUnread);
    window.addEventListener("erent:profile-changed", onProfile);
    const poll = setInterval(() => { if (document.visibilityState === "visible") refreshUnread(); }, 60000); // safety net if realtime drops
    return () => {
      document.removeEventListener("visibilitychange", onShow); window.removeEventListener("pageshow", onShow);
      clearTimeout(timer); clearInterval(poll); sub.subscription.unsubscribe();
      window.removeEventListener("focus", refreshUnread); window.removeEventListener("erent:unread-changed", refreshUnread); window.removeEventListener("erent:profile-changed", onProfile);
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => { resync.current(); window.dispatchEvent(new Event("erent:unread-changed")); }, [pathname]);
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}
