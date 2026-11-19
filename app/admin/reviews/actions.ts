"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Removes a review. Only with a written reason (proof of defamation or abuse), only for staff with the review.delete permission, and always logged. */
export async function removeReview(reviewId: string, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 15) return { error: "Write the proof or reason (at least 15 characters)" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first" };
  const { data: r } = await supabase.from("reviews").select("id, listing_id, landlord_id, author_id").eq("id", reviewId).maybeSingle();
  const { data, error } = await supabase.from("reviews").delete().eq("id", reviewId).select("id");
  if (error || !data?.length) return { error: "You need the review removal permission" };
  await supabase.from("admin_audit_log").insert({ actor_id: user.id, action: "review.removed", target_type: "review", target_id: reviewId, metadata: { reason, listing_id: r?.listing_id ?? null, landlord_id: r?.landlord_id ?? null, author_id: r?.author_id ?? null } });
  revalidatePath("/admin/reviews"); revalidatePath("/listing", "layout"); revalidatePath("/landlord", "layout");
  return { ok: true };
}
