"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeKenyanPhone } from "@/lib/phone";
import type { ActionState } from "@/app/dashboard/actions";

const schema = z.object({ full_name: z.string().trim().min(2, "Enter your full name").max(80), phone: z.string().trim().default("") });

export async function updateProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const p = schema.safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: p.error.issues[0].message };
  let phone: string | null = null;
  if (p.data.phone) {
    phone = normalizeKenyanPhone(p.data.phone);
    if (!phone) return { error: "Enter a Kenyan mobile number, for example 0712 345 678" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again" };
  const { error } = await supabase.from("profiles").update({ full_name: p.data.full_name, phone }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/account");
  return { ok: true, message: phone ? `Saved. Your number is ${phone}. It is only shown to people you approve.` : "Saved" };
}

export async function acknowledgeNotice(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("acknowledge_sanction", { p_id: id });
  if (error) return { error: error.message };
  revalidatePath("/account"); revalidatePath("/dashboard", "layout");
  return { ok: true };
}
