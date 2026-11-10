"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/app/dashboard/actions";

async function audit(action: string, id: string, metadata: Record<string, unknown> = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("admin_audit_log").insert({ actor_id: user.id, action, target_type: "verification", target_id: id, metadata });
}

export async function decide(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id")); const decision = String(formData.get("decision"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (!["approved", "rejected"].includes(decision)) return { error: "Unknown decision" };
  const supabase = await createClient();
  const { error } = await supabase.from("landlord_verifications")
    .update({ status: decision, reject_reason: decision === "rejected" ? reason : null }).eq("id", id);
  if (error) return { error: error.message };
  await audit(`verification.${decision}`, id, decision === "rejected" ? { reason } : {});
  revalidatePath("/admin/verifications"); revalidatePath("/", "layout");
  return { ok: true, message: decision === "approved" ? "Approved. The badge is now live." : "Rejected. The applicant sees your reason." };
}

/** Identity documents are deleted once a decision is made, so they are not kept longer than needed. */
export async function purgeDocuments(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { data: v } = await supabase.from("landlord_verifications").select("status").eq("id", id).maybeSingle();
  if (!v || v.status === "pending") return { error: "Decide the application before deleting its documents" };
  const { data: docs } = await supabase.from("verification_documents").select("id, storage_path").eq("verification_id", id);
  if (docs?.length) {
    await supabase.storage.from("verification-docs").remove(docs.map((d) => d.storage_path));
    await supabase.from("verification_documents").delete().eq("verification_id", id);
  }
  await audit("verification.documents_deleted", id, { count: docs?.length ?? 0 });
  revalidatePath(`/admin/verifications/${id}`);
  return { ok: true, message: `Deleted ${docs?.length ?? 0} documents` };
}
