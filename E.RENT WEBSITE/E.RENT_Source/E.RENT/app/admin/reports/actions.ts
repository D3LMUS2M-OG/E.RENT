"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/app/dashboard/actions";

/** Suspensions and bans also lock the sign-in itself. The database already blocks every action for a sanctioned user. */
async function setAuthBan(userId: string, hours: number | null) {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.auth.admin.updateUserById(userId, { ban_duration: hours === null ? "none" : `${hours}h` });
}

export async function issueSanction(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = String(formData.get("user_id")); const kind = String(formData.get("kind"));
  const reason = String(formData.get("reason") ?? "").trim(); const days = Number(formData.get("days") ?? 7) || 7;
  const reportId = String(formData.get("report_id") ?? "") || null;
  if (!["warning", "summons", "suspension", "ban"].includes(kind)) return { error: "Choose an action" };
  if (reason.length < 10) return { error: "Write a reason of at least 10 characters. The user will see it" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("issue_sanction", { p_user: userId, p_kind: kind, p_reason: reason, p_days: kind === "suspension" ? days : null, p_report: reportId });
  if (error) return { error: error.message };
  if (kind === "suspension") await setAuthBan(userId, days * 24);
  if (kind === "ban") await setAuthBan(userId, 876000);
  revalidatePath("/admin/reports"); revalidatePath("/admin/users");
  return { ok: true, message: "Done. The action is in the audit log." };
}

export async function liftSanction(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: userId, error } = await supabase.rpc("lift_sanction", { p_id: id });
  if (error) return { error: error.message };
  // Only remove the sign-in lock when no other suspension or ban is still active
  const { count } = await supabase.from("user_sanctions").select("id", { count: "exact", head: true })
    .eq("user_id", userId).in("kind", ["suspension", "ban"]).is("lifted_at", null);
  if (!count) await setAuthBan(userId as string, null);
  revalidatePath("/admin/users"); return { ok: true };
}

export async function dismissReport(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_report", { p_id: String(formData.get("report_id")), p_note: String(formData.get("note") ?? "") });
  if (error) return { error: error.message };
  revalidatePath("/admin/reports"); return { ok: true, message: "Report dismissed" };
}
