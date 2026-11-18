import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RETENTION_DAYS = 30;
const BUCKET = "chat-attachments";

/** Files of messages deleted for everyone live in the evidence bucket (deleted/...). Reports keep their own copies. */
async function removeDeletedOriginals(admin: NonNullable<ReturnType<typeof createAdminClient>>, column: "message_id" | "conversation_id", ids: string[]) {
  const { data } = await admin.from("deleted_message_originals").select("archived_path, attachment_path").in(column, ids);
  const archived = (data ?? []).map((o) => o.archived_path).filter(Boolean) as string[];
  const leftover = (data ?? []).filter((o) => !o.archived_path && o.attachment_path).map((o) => o.attachment_path) as string[];
  if (archived.length) await admin.storage.from("report-evidence").remove(archived);
  if (leftover.length) await admin.storage.from(BUCKET).remove(leftover);
  return archived.length + leftover.length;
}

/** Daily purge (CHT-7): messages older than 30 days, and conversations both people deleted, together with their files.
 *  Reported conversations are safe: their evidence was copied when the report was made. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 500 });

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 864e5).toISOString();
  let messages = 0, files = 0, conversations = 0;

  for (let i = 0; i < 20; i++) {
    const { data } = await admin.from("messages").select("id, attachment_path").lt("created_at", cutoff).limit(500);
    if (!data?.length) break;
    const paths = data.map((m) => m.attachment_path).filter(Boolean) as string[];
    if (paths.length) { await admin.storage.from(BUCKET).remove(paths); files += paths.length; }
    files += await removeDeletedOriginals(admin, "message_id", data.map((m) => m.id));
    await admin.from("messages").delete().in("id", data.map((m) => m.id));
    messages += data.length;
  }

  const { data: gone } = await admin.from("conversations").select("id").not("tenant_deleted_at", "is", null).not("landlord_deleted_at", "is", null).limit(200);
  if (gone?.length) {
    const ids = gone.map((c) => c.id);
    const { data: att } = await admin.from("messages").select("attachment_path").in("conversation_id", ids).not("attachment_path", "is", null);
    const paths = (att ?? []).map((m) => m.attachment_path) as string[];
    if (paths.length) { await admin.storage.from(BUCKET).remove(paths); files += paths.length; }
    files += await removeDeletedOriginals(admin, "conversation_id", ids);
    await admin.from("conversations").delete().in("id", ids);
    conversations = ids.length;
  }
  return NextResponse.json({ ok: true, messages, files, conversations, cutoff });
}
