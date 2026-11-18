"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DataState = { error?: string; ok?: boolean };
type Table = "property_types" | "amenities";
const slugify = (s: string) => s.toLowerCase().trim().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function log(supabase: Awaited<ReturnType<typeof createClient>>, action: string, table: Table, id: string, metadata: Record<string, unknown>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("admin_audit_log").insert({ actor_id: user.id, action, target_type: table, target_id: id, metadata });
}

/** Adds a house type or an amenity. Row-level security requires the data.manage permission. */
export async function addItem(table: Table, _: DataState, formData: FormData): Promise<DataState> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 60) return { error: "Give it a name of 2 to 60 characters" };
  const slug = slugify(name); if (!slug) return { error: "Use letters or numbers in the name" };
  const supabase = await createClient();
  const row: Record<string, unknown> = { slug, name };
  if (table === "amenities") row.category = String(formData.get("category") ?? "general").trim() || "general";
  else { const { data } = await supabase.from("property_types").select("sort").order("sort", { ascending: false }).limit(1); row.sort = ((data?.[0]?.sort as number | undefined) ?? 0) + 1; }
  const { data, error } = await supabase.from(table).insert(row).select("id").single();
  if (error) return { error: error.code === "23505" ? "That already exists" : "You need the data permission to add this" };
  await log(supabase, "data.added", table, String(data.id), { name });
  revalidatePath("/admin/data"); return { ok: true };
}

export async function renameItem(table: Table, id: number, name: string): Promise<{ error?: string }> {
  const clean = name.trim(); if (clean.length < 2 || clean.length > 60) return { error: "Give it a name of 2 to 60 characters" };
  const supabase = await createClient();
  const { data, error } = await supabase.from(table).update({ name: clean }).eq("id", id).select("id");
  if (error || !data?.length) return { error: "You need the data permission to change this" };
  await log(supabase, "data.renamed", table, String(id), { name: clean });
  revalidatePath("/admin/data"); return {};
}

/** Hiding keeps old listings intact but removes the option from new listings and filters. */
export async function setActive(table: Table, id: number, active: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from(table).update({ is_active: active }).eq("id", id).select("id");
  if (error || !data?.length) return { error: "You need the data permission to change this" };
  await log(supabase, active ? "data.shown" : "data.hidden", table, String(id), {});
  revalidatePath("/admin/data"); revalidatePath("/", "layout"); return {};
}
