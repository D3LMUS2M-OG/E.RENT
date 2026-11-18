import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { backoffMinutes, deliver, type OutboxRow } from "@/lib/notify/deliver";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The notification worker. Call it every few minutes with `Authorization: Bearer <CRON_SECRET>`.
 *  It takes the due outbox rows, sends them by email or WhatsApp as each person allows, and retries failures with a growing wait. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 500 });

  const counts = { claimed: 0, sent: 0, skipped: 0, retry: 0, failed: 0 };
  for (let round = 0; round < 4; round++) {
    const { data, error } = await admin.rpc("claim_outbox", { p_limit: 25 });
    if (error) return NextResponse.json({ error: error.message, ...counts }, { status: 500 });
    const rows = (data ?? []) as OutboxRow[];
    if (rows.length === 0) break;
    counts.claimed += rows.length;
    for (let i = 0; i < rows.length; i += 5) {
      await Promise.all(rows.slice(i, i + 5).map(async (row) => {
        let out;
        try { out = await deliver(admin, row); } catch (e) { out = { status: row.attempts >= 5 ? "failed" as const : "retry" as const, error: String((e as Error).message ?? e) }; }
        counts[out.status]++;
        const patch = out.status === "retry"
          ? { next_attempt_at: new Date(Date.now() + backoffMinutes(row.attempts) * 60_000).toISOString(), last_error: out.error ?? null }
          : { status: out.status, last_error: out.error ?? null, sent_at: out.status === "sent" ? new Date().toISOString() : null };
        await admin.from("notification_outbox").update(patch).eq("id", row.id);
      }));
    }
    if (rows.length < 25) break;
  }
  return NextResponse.json({ ok: true, ...counts });
}
