import { createAdminClient } from "@/lib/supabase/admin";
import { CheckCircle2, CircleAlert } from "lucide-react";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

const card = "rounded-[24px] border border-border bg-surface p-5";

export default async function AdminNotifications() {
  // The admin layout already requires staff. The outbox has no row-level policies on purpose, so it is read with the server key.
  const admin = createAdminClient();
  const setup: [string, boolean, string][] = [
    ["Server key (SUPABASE_SERVICE_ROLE_KEY)", Boolean(admin), "Needed to read and send the outbox."],
    ["Worker secret (CRON_SECRET)", Boolean(process.env.CRON_SECRET), "The scheduler must call /api/cron/notifications with it."],
    ["Email (RESEND_API_KEY)", Boolean(process.env.RESEND_API_KEY), "Without it, only in-app notifications are delivered."],
    ["WhatsApp (token, phone id, template)", Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TEMPLATE_NAME), "Optional. Needs an approved template."],
  ];
  if (!admin) return <Shell setup={setup}><p className={card}>Set SUPABASE_SERVICE_ROLE_KEY to see the outbox.</p></Shell>;

  const since = new Date(Date.now() - 864e5).toISOString();
  const n = async (status: string, recent = false) => {
    let q = admin.from("notification_outbox").select("id", { count: "exact", head: true }).eq("status", status);
    if (recent) q = q.gte("created_at", since);
    return (await q).count ?? 0;
  };
  const [pending, failed, sent, skipped, { data: bad }] = await Promise.all([
    n("pending"), n("failed"), n("sent", true), n("skipped", true),
    admin.from("notification_outbox").select("id, event, title, attempts, last_error, created_at").eq("status", "failed").order("created_at", { ascending: false }).limit(20),
  ]);
  const { count: late } = await admin.from("notification_outbox").select("id", { count: "exact", head: true }).eq("status", "pending").lt("next_attempt_at", new Date(Date.now() - 15 * 60_000).toISOString());
  const stuck = late ?? 0;
  const stats: [string, number][] = [["Waiting", pending], ["Sent (24 h)", sent], ["Skipped (24 h)", skipped], ["Failed", failed]];
  return (
    <Shell setup={setup}>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">{stats.map(([l, n]) => <li key={l} className={card}><p className="text-3xl font-semibold">{n}</p><p className="text-sm text-muted">{l}</p></li>)}</ul>
      {stuck > 0 ? <p role="alert" className="rounded-[20px] border border-border-strong bg-surface p-4 text-sm font-medium"><CircleAlert className="mr-2 inline size-4" aria-hidden />{stuck} {stuck === 1 ? "notification has" : "notifications have"} been waiting over 15 minutes. The worker is probably not being called: schedule /api/cron/notifications every 5 minutes.</p> : pending > 0 && <p className="text-sm text-muted">Waiting rows are new, or chat messages held back for 5 minutes in case they get read.</p>}
      <section className={card}><h2 className="text-xl">Failed after 5 tries</h2>
        {!bad?.length ? <p className="mt-2 text-muted">None.</p> : <ul className="mt-3 divide-y divide-border">{bad.map((b) => <li key={b.id} className="py-2.5 text-sm"><b>{b.title}</b> <span className="text-muted">({b.event}, {b.attempts} tries)</span><br /><span className="break-all text-muted">{b.last_error}</span></li>)}</ul>}</section>
    </Shell>
  );
}

function Shell({ setup, children }: { setup: [string, boolean, string][]; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Notifications</h1>
      <section className={card}><h2 className="text-xl">Setup</h2>
        <ul className="mt-3 space-y-2">{setup.map(([l, ok, d]) => <li key={l} className="flex items-start gap-3 text-sm">{ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-link" aria-hidden /> : <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />}<span><b>{l}</b>: {ok ? "set" : "not set"}<br /><span className="text-muted">{d}</span></span></li>)}</ul></section>
      {children}
    </div>
  );
}
