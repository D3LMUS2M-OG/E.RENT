"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type StaffState = { error?: string; ok?: boolean };

export async function addStaff(_: StaffState, formData: FormData): Promise<StaffState> {
  const email = String(formData.get("email") ?? "").trim(); const role = String(formData.get("role") ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter their email address" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_add", { p_email: email, p_role: role });
  if (error) return { error: error.message.length < 140 ? error.message : "Could not add them" };
  revalidatePath("/admin/staff"); return { ok: true };
}

export async function removeStaff(userId: string, role: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_remove", { p_user: userId, p_role: role });
  if (error) return { error: error.message.length < 140 ? error.message : "Could not remove" };
  revalidatePath("/admin/staff"); return {};
}
