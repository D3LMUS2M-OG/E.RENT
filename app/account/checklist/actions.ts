"use server";

import { createClient } from "@/lib/supabase/server";
import { ALL_KEYS } from "@/lib/checklist";

/** Saves the ticks and notes. One list per rental, or one general list when there is no request. */
export async function saveChecklist(requestId: string | null, done: string[], notes: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first" };
  const clean = [...new Set(done.filter((k) => ALL_KEYS.includes(k)))];
  const row = { done: clean, notes: notes.slice(0, 4000), updated_at: new Date().toISOString() };
  let q = supabase.from("move_in_checklists").select("id").eq("user_id", user.id);
  q = requestId ? q.eq("request_id", requestId) : q.is("request_id", null);
  const { data: existing } = await q.maybeSingle();
  const { error } = existing
    ? await supabase.from("move_in_checklists").update(row).eq("id", existing.id)
    : await supabase.from("move_in_checklists").insert({ user_id: user.id, request_id: requestId, ...row });
  return error ? { error: "Could not save. We will try again." } : {};
}
