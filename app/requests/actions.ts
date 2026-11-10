"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/app/dashboard/actions";

const refresh = () => { revalidatePath("/account/requests"); revalidatePath("/dashboard/requests"); revalidatePath("/dashboard"); };
const friendly = (code: string | undefined, msg: string) =>
  code === "23505" ? "You already have an open request of this kind for this house" : msg.includes("row-level security") ? "You are not allowed to do that" : msg;

const requestSchema = z.object({
  kind: z.enum(["view", "apply"]),
  message: z.string().trim().max(1000, "Keep the message under 1,000 characters").default(""),
  preferred_date: z.preprocess((v) => (v === "" ? undefined : v), z.iso.date().optional()),
  occupants: z.coerce.number().int().min(1, "At least 1 person").max(20),
});

export async function createRequest(listingId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const p = requestSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: p.error.issues[0].message };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to send a request" };
  const { error } = await supabase.from("rental_requests").insert({
    listing_id: listingId, tenant_id: user.id, kind: p.data.kind, message: p.data.message,
    preferred_date: p.data.preferred_date ?? null, occupants: p.data.occupants,
  });
  if (error) return { error: friendly(error.code, error.message) };
  refresh();
  return { ok: true, message: p.data.kind === "view" ? "Viewing request sent. You will see the answer under Account, My requests." : "Application sent. You will see the answer under Account, My requests." };
}

export async function cancelRequest(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("rental_requests").update({ status: "cancelled" }).eq("id", id);
  if (error) return { error: friendly(error.code, error.message) };
  refresh(); return { ok: true };
}

export async function respondRequest(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id")); const decision = String(formData.get("decision"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!["accepted", "declined"].includes(decision)) return { error: "Unknown decision" };
  const supabase = await createClient();
  const { error } = await supabase.from("rental_requests").update({ status: decision, decision_note: note || null }).eq("id", id);
  if (error) return { error: friendly(error.code, error.message) };
  refresh(); return { ok: true };
}

/** The tenant records that the viewing happened. This unlocks the tour review (Step 10). */
export async function markViewed(requestId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: r } = await supabase.from("rental_requests").select("listing_id").eq("id", requestId).maybeSingle();
  if (!user || !r) return { error: "Request not found" };
  const { error } = await supabase.from("tours").insert({ request_id: requestId, listing_id: r.listing_id, tenant_id: user.id });
  if (error) return { error: error.code === "23505" ? "Already recorded" : friendly(error.code, error.message) };
  refresh(); return { ok: true };
}

export async function proposeRental(requestId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: r } = await supabase.from("rental_requests").select("listing_id, tenant_id").eq("id", requestId).maybeSingle();
  if (!r) return { error: "Request not found" };
  const { error } = await supabase.from("rentals").insert({ listing_id: r.listing_id, tenant_id: r.tenant_id, request_id: requestId });
  if (error) return { error: error.code === "23505" ? "A rental is already open for this tenant" : friendly(error.code, error.message) };
  refresh(); return { ok: true };
}

export async function respondRental(rentalId: string, accept: boolean): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("rentals").update({ status: accept ? "confirmed" : "cancelled" }).eq("id", rentalId);
  if (error) return { error: friendly(error.code, error.message) };
  refresh(); revalidatePath("/", "layout"); return { ok: true };
}
