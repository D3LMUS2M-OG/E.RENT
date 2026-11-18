"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/app/dashboard/actions";

const DOC_KINDS = ["national_id_front", "national_id_back", "proof_of_ownership", "kra_pin", "selfie_with_id"] as const;
export type DocKind = (typeof DOC_KINDS)[number];
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024;

const SETUP_HINT = "Verification is not set up in the database yet. Run supabase/migrations/20261110000300_verification_geo.sql in the SQL Editor.";
const isMissing = (e: { code?: string; message?: string }) =>
  e.code === "42P01" || e.code === "PGRST205" || /does not exist|schema cache/i.test(e.message ?? "");

async function ctx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in again");
  const sel = await supabase.from("landlord_verifications").select("id, status").eq("user_id", user.id).maybeSingle();
  if (sel.error) throw new Error(isMissing(sel.error) ? SETUP_HINT : sel.error.message);
  let v = sel.data;
  if (!v) {
    const ins = await supabase.from("landlord_verifications").insert({ user_id: user.id }).select("id, status").single();
    if (ins.error) {
      throw new Error(/row-level security/i.test(ins.error.message) ? "Add the landlord role to your account first (Account page)" : isMissing(ins.error) ? SETUP_HINT : ins.error.message);
    }
    v = ins.data;
  }
  return { supabase, user, v: v! };
}
/** Server actions must never throw to the browser: a throw becomes the generic "page couldn't load" screen. */
async function safe<T extends { error?: string }>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try { return await fn(); } catch (e) { return { error: e instanceof Error ? e.message : "Something went wrong" }; }
}
const editable = (s: string) => s === "draft" || s === "rejected";

export async function getDocUploadTarget(kind: DocKind, file: { type: string; size: number }): Promise<{ path?: string; token?: string; error?: string }> {
  try {
    const { supabase, user, v } = await ctx();
    if (!DOC_KINDS.includes(kind)) return { error: "Unknown document" };
    if (!editable(v.status)) return { error: "This application is already submitted" };
    if (!OK_TYPES.includes(file.type)) return { error: "Use a JPG, PNG, WebP or PDF file" };
    if (file.size > MAX_BYTES) return { error: "Each file must be under 10 MB" };
    const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${user.id}/${v.id}/${kind}-${randomUUID()}.${ext}`;
    const { data, error } = await supabase.storage.from("verification-docs").createSignedUploadUrl(path);
    if (error || !data) return { error: "Could not prepare the upload" };
    return { path, token: data.token };
  } catch (e) { return { error: e instanceof Error ? e.message : "Something went wrong" }; }
}

export async function registerDocument(kind: DocKind, path: string, mime: string): Promise<ActionState> {
  try {
    const { supabase, user, v } = await ctx();
    if (!path.startsWith(`${user.id}/${v.id}/`) || !DOC_KINDS.includes(kind)) return { error: "Invalid file" };
    const { data: old } = await supabase.from("verification_documents").select("id, storage_path").eq("verification_id", v.id).eq("kind", kind).maybeSingle();
    if (old) {
      await supabase.from("verification_documents").delete().eq("id", old.id);
      await supabase.storage.from("verification-docs").remove([old.storage_path]);
    }
    const { error } = await supabase.from("verification_documents").insert({ verification_id: v.id, kind, storage_path: path, mime });
    if (error) { await supabase.storage.from("verification-docs").remove([path]); return { error: "This application is already submitted" }; }
    revalidatePath("/dashboard/verification");
    return { ok: true };
  } catch (e) { return { error: e instanceof Error ? e.message : "Something went wrong" }; }
}

export async function removeDocument(docId: string): Promise<ActionState> {
  return safe(async () => {
  const { supabase } = await ctx();
  const { data: d } = await supabase.from("verification_documents").select("storage_path").eq("id", docId).maybeSingle();
  const { error } = await supabase.from("verification_documents").delete().eq("id", docId);
  if (error) return { error: "This application is already submitted" };
  if (d) await supabase.storage.from("verification-docs").remove([d.storage_path]);
  revalidatePath("/dashboard/verification");
  return { ok: true };
  });
}

export async function saveOwnershipKind(kind: string): Promise<ActionState> {
  if (!["title_deed", "lease", "utility_bill"].includes(kind)) return { error: "Choose one" };
  return safe(async () => {
  const { supabase, v } = await ctx();
  const { error } = await supabase.from("landlord_verifications").update({ ownership_kind: kind }).eq("id", v.id);
  if (error) return { error: error.message.includes("row-level") ? "This application is already submitted" : error.message };
  revalidatePath("/dashboard/verification");
  return { ok: true };
  });
}

export async function submitVerification(): Promise<ActionState> {
  return safe(async () => {
  const { supabase, v } = await ctx();
  const { error } = await supabase.from("landlord_verifications").update({ status: "pending" }).eq("id", v.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/verification");
  return { ok: true, message: "Submitted. A verifier will review it." };
  });
}

export async function withdrawVerification(): Promise<ActionState> {
  return safe(async () => {
  const { supabase, v } = await ctx();
  const { error } = await supabase.from("landlord_verifications").update({ status: "draft" }).eq("id", v.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/verification");
  return { ok: true };  });
}
