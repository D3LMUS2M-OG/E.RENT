"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/app/dashboard/actions";

const invite = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address"), kind: z.enum(["caretaker", "agent"]) });

export async function inviteDelegate(_: ActionState, formData: FormData): Promise<ActionState> {
  const p = invite.safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: p.error.issues[0].message };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again" };
  const { error } = await supabase.from("delegations").insert({ landlord_id: user.id, invited_email: p.data.email, kind: p.data.kind, status: "invited" });
  if (error) {
    if (error.code === "23505") return { error: "You already invited this email" };
    return { error: error.message.includes("row-level security") ? "You cannot invite your own email, and you need the landlord role" : error.message };
  }
  revalidatePath("/dashboard/team");
  return { ok: true, message: `Invitation saved. Ask ${p.data.email} to sign up or sign in with that email and accept it under Account.` };
}

export async function revokeDelegation(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("delegations").update({ status: "revoked" }).eq("id", id);
  revalidatePath("/dashboard/team"); revalidatePath("/dashboard");
}

export async function respondToInvitation(id: string, accept: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("respond_delegation", { p_id: id, p_accept: accept });
  revalidatePath("/account"); revalidatePath("/dashboard");
}
