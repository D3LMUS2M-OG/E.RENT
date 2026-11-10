"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/app/dashboard/actions";

export async function startChat(listingId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_conversation", { p_listing: listingId });
  if (error) return { error: error.message };
  redirect(`/chats/${data}`);
}

export async function deleteConversation(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_conversation", { p_id: id });
  if (error) return { error: error.message };
  revalidatePath("/chats"); redirect("/chats");
}

export async function blockUser(userId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again" };
  const { error } = await supabase.from("blocks").upsert({ blocker_id: user.id, blocked_id: userId }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
  if (error) return { error: error.message };
  revalidatePath("/chats"); return { ok: true };
}

export async function unblockUser(userId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again" };
  const { error } = await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/chats"); return { ok: true };
}

export async function setChatContactShare(convId: string, action: "ask" | "share" | "approve" | "decline" | "revoke"): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_chat_contact_share", { p_conv: convId, p_action: action });
  if (error) return { error: error.message };
  revalidatePath(`/chats/${convId}`); return { ok: true };
}

/** Files a report, then copies the reported attachments into the evidence bucket so they survive the 30-day purge. */
export async function reportConversation(convId: string, reason: string, details: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: rid, error } = await supabase.rpc("report_conversation", { p_conv: convId, p_reason: reason, p_details: details });
  if (error) return { error: error.message };

  const admin = createAdminClient();
  if (admin) {
    const { data: rows } = await admin.from("report_evidence").select("id, evidence_path").eq("report_id", rid).not("evidence_path", "is", null);
    for (const r of rows ?? []) {
      try {
        const { data: blob } = await admin.storage.from("chat-attachments").download(r.evidence_path!);
        if (!blob) throw new Error("missing");
        const dest = `${rid}/${r.id}-${r.evidence_path!.split("/").pop()}`;
        await admin.storage.from("report-evidence").upload(dest, blob, { contentType: blob.type, upsert: true });
        await admin.from("report_evidence").update({ evidence_path: dest }).eq("id", r.id);
      } catch { await admin.from("report_evidence").update({ evidence_path: null }).eq("id", r.id); }
    }
  } else {
    console.warn("SUPABASE_SERVICE_ROLE_KEY missing: report attachments were not preserved");
  }
  return { ok: true, message: "Report sent. A moderator will review this conversation." };
}

export async function reportListing(listingId: string, reason: string, details: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_listing", { p_listing: listingId, p_reason: reason, p_details: details });
  if (error) return { error: error.message };
  return { ok: true, message: "Thank you. A moderator will check this listing." };
}
