"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKETS = ["avatars", "review-photos", "verification-docs", "chat-attachments", "listing-media"] as const;

/** Removes every file under a folder, going down through sub-folders. */
async function purge(admin: NonNullable<ReturnType<typeof createAdminClient>>, bucket: string, prefix: string, depth = 0): Promise<void> {
  if (depth > 4) return;
  const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (!data?.length) return;
  const files: string[] = [];
  for (const o of data) { if (o.id) files.push(`${prefix}/${o.name}`); else await purge(admin, bucket, `${prefix}/${o.name}`, depth + 1); }
  if (files.length) await admin.storage.from(bucket).remove(files);
}

/** Deletes the account for good: files first, then the sign-in record, which removes the person's rows with it. */
export async function deleteMyAccount(confirmation: string): Promise<{ error?: string }> {
  if (confirmation.trim() !== "DELETE") return { error: "Type DELETE to confirm" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first" };
  const { count } = await supabase.from("staff_roles").select("user_id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) > 0) return { error: "Staff accounts must be removed from the team by the super admin before they can be deleted." };
  const admin = createAdminClient();
  if (!admin) return { error: "Deleting is not available right now. Please contact us and we will do it for you." };
  for (const b of BUCKETS) { try { await purge(admin, b, user.id); } catch { /* keep going: the account row matters most */ } }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "We could not finish deleting your account. Please contact us and we will complete it." };
  await supabase.auth.signOut();
  redirect("/?account-deleted=1");
}
