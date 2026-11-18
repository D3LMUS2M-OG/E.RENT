import Link from "next/link";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NotificationPrefs } from "@/components/account/notification-prefs";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await getAccess("/account/notifications");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("id, title, body, url, created_at, read_at").order("created_at", { ascending: false }).limit(60);
  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-12">
      <section aria-labelledby="list"><h1 id="list" className="text-3xl">Notifications</h1>
        {!data?.length ? <p className="mt-4 text-muted">Nothing yet. We will tell you about requests, rentals, reviews and verification here.</p> : (
          <ul className="mt-5 space-y-2">{data.map((n) => (
            <li key={n.id}><Link href={n.url ?? "/account"} className="flex gap-3 rounded-[20px] border border-border bg-surface p-4 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-foreground/40">
              <span aria-hidden className={cn("mt-2 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} />
              <span className="min-w-0 flex-1"><b className="block">{n.title}</b>{n.body && <span className="block text-sm text-muted">{n.body}</span>}<span className="mt-1 block text-xs text-muted">{new Date(n.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</span></span></Link></li>))}</ul>)}
      </section>
      <section aria-labelledby="prefs" className="space-y-3"><h2 id="prefs" className="text-2xl">How should we reach you?</h2><NotificationPrefs /></section>
    </div>
  );
}
