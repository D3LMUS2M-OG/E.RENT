import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Access = {
  userId: string;
  email: string;
  roles: string[];
  staffRoles: string[];
  isStaff: boolean;
  isSuperAdmin: boolean;
  isLandlord: boolean;
  orgIds: string[];
  landlordIds: string[]; // landlords this user may post for (self, personal delegations, and their organisations' delegations)
  fullName: string;
};

/** Reads roles from the database (RLS lets a user read their own rows), so it works even before the auth hook is enabled. */
export async function getAccess(next = "/account"): Promise<Access> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);

  const [roles, staff, deleg, profile, orgs] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("staff_roles").select("role").eq("user_id", user.id),
    supabase.from("delegations").select("landlord_id").eq("delegate_id", user.id).eq("status", "active"),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("organization_members").select("organization_id").eq("user_id", user.id),
  ]);
  const orgIds = (orgs.data ?? []).map((o) => o.organization_id as string);
  const orgDeleg = orgIds.length ? await supabase.from("delegations").select("landlord_id").in("organization_id", orgIds).eq("status", "active") : { data: [] as { landlord_id: string }[] };
  const roleList = (roles.data ?? []).map((r) => r.role as string);
  const staffList = (staff.data ?? []).map((r) => r.role as string);
  const isLandlord = roleList.includes("landlord");
  return {
    userId: user.id,
    email: user.email ?? "",
    roles: roleList,
    staffRoles: staffList,
    isStaff: staffList.length > 0,
    isSuperAdmin: staffList.includes("super_admin"),
    isLandlord,
    orgIds,
    landlordIds: [...new Set([...(isLandlord ? [user.id] : []), ...(deleg.data ?? []).map((d) => d.landlord_id as string), ...(orgDeleg.data ?? []).map((d) => d.landlord_id as string)])],
    fullName: profile.data?.full_name ?? "",
  };
}
