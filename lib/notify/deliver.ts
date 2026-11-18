import type { SupabaseClient } from "@supabase/supabase-js";

export type OutboxRow = { id: string; user_id: string; event: string; title: string; body: string; url: string | null; payload: Record<string, unknown>; attempts: number };
export type Outcome = { status: "sent" | "skipped" | "retry" | "failed"; error?: string };

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const MAX_ATTEMPTS = 5;

function emailHtml(r: OutboxRow) {
  const link = r.url ? `${SITE()}${r.url}` : SITE();
  return `<div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
  <p style="font-size:20px;font-weight:700;margin:0 0 16px">E<span style="color:#ff4d00">.</span>Rent</p>
  <h1 style="font-size:20px;margin:0 0 8px">${esc(r.title)}</h1>
  <p style="font-size:16px;line-height:1.5;color:#333;margin:0 0 20px">${esc(r.body)}</p>
  <a href="${esc(link)}" style="display:inline-block;background:#ff4d00;color:#111;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px">Open E.Rent</a>
  <p style="font-size:12px;color:#777;margin:28px 0 0">You get this because of your notification settings. Change them in your account under Notifications. E.Rent never asks for money by email.</p></div>`;
}

async function sendEmail(to: string, r: OutboxRow) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.NOTIFY_FROM ?? "E.Rent <onboarding@resend.dev>", to: [to], subject: r.title, html: emailHtml(r), text: `${r.title}\n\n${r.body}\n\n${r.url ? SITE() + r.url : SITE()}` }),
  });
  if (!res.ok) throw new Error(`email ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** WhatsApp only allows approved message templates for business-started messages: the template needs two body variables (title, text). */
async function sendWhatsApp(phone: string, r: OutboxRow) {
  const to = phone.replace(/\D/g, "");
  const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST", headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template: { name: process.env.WHATSAPP_TEMPLATE_NAME, language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "en" },
      components: [{ type: "body", parameters: [{ type: "text", text: r.title.slice(0, 120) }, { type: "text", text: (r.body || r.title).slice(0, 300) }] }] } }),
  });
  if (!res.ok) throw new Error(`whatsapp ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Sends one outbox row through the channels the person allows. */
export async function deliver(admin: SupabaseClient, r: OutboxRow): Promise<Outcome> {
  // A chat message is only worth an email if it is still unread
  if (r.event === "chat_message") {
    const cid = r.payload.conversation_id as string | undefined; const rid = r.payload.recipient_id as string | undefined;
    if (cid && rid) {
      const { count } = await admin.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", cid).neq("sender_id", rid).is("read_at", null);
      if (!count) return { status: "skipped" };
    }
  }
  const { data: prefs } = await admin.from("notification_preferences").select("email, whatsapp").eq("user_id", r.user_id).maybeSingle();
  const wantEmail = prefs?.email ?? true; const wantWhatsApp = prefs?.whatsapp ?? false;
  const emailReady = Boolean(process.env.RESEND_API_KEY);
  const waReady = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TEMPLATE_NAME);

  const jobs: Promise<void>[] = [];
  if (wantEmail && emailReady) {
    const { data } = await admin.auth.admin.getUserById(r.user_id);
    const email = data.user?.email;
    if (email) jobs.push(sendEmail(email, r));
  }
  if (wantWhatsApp && waReady) {
    const { data: p } = await admin.from("profiles").select("phone").eq("id", r.user_id).maybeSingle();
    if (p?.phone) jobs.push(sendWhatsApp(p.phone, r));
  }
  if (jobs.length === 0) return { status: "skipped" };

  const results = await Promise.allSettled(jobs);
  const errors = results.filter((x): x is PromiseRejectedResult => x.status === "rejected").map((x) => String(x.reason?.message ?? x.reason));
  if (errors.length < results.length) return { status: "sent", error: errors.join("; ") || undefined };   // at least one channel got through
  return { status: r.attempts >= MAX_ATTEMPTS ? "failed" : "retry", error: errors.join("; ") };
}

/** Wait before the next try: 2, 4, 8, 16 minutes. */
export const backoffMinutes = (attempts: number) => Math.min(2 ** attempts, 240);
