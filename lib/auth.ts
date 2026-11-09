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
  landlordIds: string[]; // landlords this user may post for (self plus active delegations)
  fullName: string;
};

/** Reads roles from the database (RLS lets a user read their own rows), so it works even before the auth hook is enabled. */
export async function getAccess(next = "/account"): Promise<Access> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);

  const [roles, staff, deleg, profile] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("staff_roles").select("role").eq("user_id", user.id),
    supabase.from("delegations").select("landlord_id").eq("delegate_id", user.id).eq("status", "active"),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
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
    landlordIds: [...(isLandlord ? [user.id] : []), ...(deleg.data ?? []).map((d) => d.landlord_id as string)],
    fullName: profile.data?.full_name ?? "",
  };
}
