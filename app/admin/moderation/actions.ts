"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/app/dashboard/actions";

async function audit(action: string, targetId: string, metadata: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("admin_audit_log").insert({ actor_id: user.id, action, target_type: "listing", target_id: targetId, metadata });
}

export async function takeDown(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("listing_id"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 10) return { error: "Give the owner a reason of at least 10 characters" };
  const supabase = await createClient();
  const { error } = await supabase.from("listings").update({ status: "taken_down", takedown_reason: reason }).eq("id", id);
  if (error) return { error: "You do not have permission to take down listings" };
  await supabase.from("listing_flags").update({ status: "actioned" }).eq("listing_id", id).eq("status", "open");
  await audit("listing.takedown", id, { reason });
  revalidatePath("/admin/moderation"); revalidatePath("/", "layout");
  return { ok: true, message: "Taken down. The owner will see your reason." };
}

export async function restore(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("listing_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("listings").update({ status: "paused", takedown_reason: null }).eq("id", id);
  if (error) return { error: "You do not have permission to restore listings" };
  await audit("listing.restore", id, {});
  revalidatePath("/admin/moderation");
  return { ok: true, message: "Restored as paused. The owner can republish." };
}

export async function dismissFlag(flagId: string, listingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("listing_flags").update({ status: "dismissed", resolved_by: user?.id }).eq("id", flagId);
  await audit("flag.dismiss", listingId, { flag_id: flagId });
  revalidatePath("/admin/moderation");
}
