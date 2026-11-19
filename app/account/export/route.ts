import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** "Download my data": everything this account owns that we can read for it, as one JSON file. Row-level security means it can only ever be your own rows. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Sign in first", { status: 401 });
  const uid = user.id;
  const tables: [string, string][] = [
    ["profile", "profiles:id"], ["roles", "user_roles:user_id"], ["notification_preferences", "notification_preferences:user_id"], ["notifications", "notifications:user_id"],
    ["feed_preferences", "feed_preferences:user_id"], ["saved_searches", "saved_searches:user_id"], ["favourites", "favourites:user_id"], ["move_in_checklists", "move_in_checklists:user_id"],
    ["availability", "landlord_availability:user_id"], ["listings", "listings:owner_id"], ["requests_sent", "rental_requests:tenant_id"], ["reviews_written", "reviews:author_id"],
    ["messages_sent", "messages:sender_id"], ["verification_status", "landlord_verifications:user_id"], ["reports_made", "reports:reporter_id"],
  ];
  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    note: "This file holds the data E.Rent can read for your account. Messages are kept for 30 days. Identity documents are stored privately and are not included here: ask us if you want a copy.",
    account: { id: uid, email: user.email ?? null, phone: user.phone ?? null, created_at: user.created_at, sign_in_method: user.app_metadata?.provider ?? null },
  };
  await Promise.all(tables.map(async ([name, spec]) => {
    const [table, col] = spec.split(":");
    const { data, error } = await supabase.from(table).select("*").eq(col, uid).limit(5000);
    out[name] = error ? { unavailable: true } : data;
  }));
  return new NextResponse(JSON.stringify(out, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="erent-my-data-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "no-store" } });
}
