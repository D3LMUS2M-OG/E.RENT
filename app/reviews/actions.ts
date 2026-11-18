"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ReviewState = { error?: string; id?: string; slug?: string; ok?: boolean };
const star = z.coerce.number().int().min(1).max(5);
const optionalStar = z.preprocess((v) => (v === "" || v == null ? null : v), star.nullable());
const schema = z.object({
  request_id: z.uuid(), overall: star, condition: optionalStar, accuracy: optionalStar, responsiveness: optionalStar, water: optionalStar, security: optionalStar, neighbourhood: optionalStar,
  body: z.string().trim().min(10, "Write at least a sentence (10 characters)").max(2000, "Keep it under 2,000 characters"),
});

/** Creates the review. The database checks that you have a confirmed rental or a recorded viewing, and that you have not reviewed it already. */
export async function submitReview(_: ReviewState, formData: FormData): Promise<ReviewState> {
  const p = schema.safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: p.error.issues[0].message.includes("Invalid") ? "Choose an overall star rating" : p.error.issues[0].message };
  const supabase = await createClient();
  const d = p.data;
  const { data, error } = await supabase.rpc("submit_review", { p_request_id: d.request_id, p_overall: d.overall, p_condition: d.condition, p_accuracy: d.accuracy, p_responsiveness: d.responsiveness, p_water: d.water, p_security: d.security, p_neighbourhood: d.neighbourhood, p_body: d.body });
  if (error) return { error: error.message.length < 140 ? error.message : "We could not save your review. Try again." };
  revalidatePath("/account/requests");
  return { ok: true, id: data as string };
}

export async function replyToReview(reviewId: string, _: ReviewState, formData: FormData): Promise<ReviewState> {
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 1 || body.length > 1000) return { error: "Write a reply of up to 1,000 characters" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reply_to_review", { p_review_id: reviewId, p_body: body });
  if (error) return { error: error.message.length < 140 ? error.message : "We could not save your reply." };
  revalidatePath("/dashboard/reviews"); revalidatePath("/listing", "layout"); revalidatePath("/landlord", "layout");
  return { ok: true };
}
