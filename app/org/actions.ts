"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/app/dashboard/actions";

const refresh = () => { revalidatePath("/org"); revalidatePath("/account"); revalidatePath("/dashboard", "layout"); };

export async function createOrganization(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", { p_name: String(formData.get("name") ?? "") });
  if (error) return { error: error.message };
  refresh(); redirect("/org");
}

export async function inviteMember(orgId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_org_member", { p_org: orgId, p_email: String(formData.get("email") ?? ""), p_role: String(formData.get("role") ?? "member") });
  if (error) return { error: error.message };
  refresh(); return { ok: true, message: "Invitation saved. Ask them to sign in with that email and accept it under Account." };
}

export async function revokeInvite(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_org_invite", { p_id: id });
  if (error) return { error: error.message };
  refresh(); return { ok: true };
}

export async function removeMember(orgId: string, userId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_org_member", { p_org: orgId, p_user: userId });
  if (error) return { error: error.message };
  refresh(); return { ok: true };
}

export async function setOrgDelegation(id: string, action: "accept" | "decline" | "end"): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("org_set_delegation", { p_id: id, p_action: action });
  if (error) return { error: error.message };
  refresh(); return { ok: true };
}

export async function respondOrgInvite(id: string, accept: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("respond_org_invite", { p_id: id, p_accept: accept });
  refresh();
}

/** Landlord side: hand your properties to an organisation using its code. */
export async function inviteOrganization(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_organization", { p_slug: String(formData.get("code") ?? "") });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/team");
  return { ok: true, message: "Sent. The organisation must accept before its team can post for you." };
}
