"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Switches a feature flag. Row-level security only lets the super admin write app_settings; the change is logged. */
export async function setFlag(key: string, value: boolean): Promise<{ error?: string }> {
  if (!/^[a-z_]{3,60}$/.test(key)) return { error: "Unknown setting" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first" };
  const { data, error } = await supabase.from("app_settings").update({ value, updated_by: user.id, updated_at: new Date().toISOString() }).eq("key", key).select("key");
  if (error || !data?.length) return { error: "Only the super admin can change settings" };
  await supabase.from("admin_audit_log").insert({ actor_id: user.id, action: "setting.changed", target_type: "setting", target_id: key, metadata: { value } });
  revalidatePath("/admin/settings"); revalidatePath("/", "layout");
  return {};
}
