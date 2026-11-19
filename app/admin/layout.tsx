import { notFound, redirect } from "next/navigation";
import { getFlags } from "@/lib/flags";
import type { Metadata } from "next";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AreaShell, type AreaItem } from "@/components/layout/area-shell";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const a = await getAccess("/admin");
  // Not staff: behave as if the page does not exist. Real enforcement is RLS and permission checks in the database.
  if (!a.isStaff) notFound();
  const supabase = await createClient();
  if ((await getFlags()).require_staff_mfa) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") redirect("/account/security?next=/admin");
  }
  const [reports, verifications, flags] = await Promise.all([
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("landlord_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("listing_flags").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);
  const items: AreaItem[] = [
    { href: "/admin", label: "Overview", icon: "overview", exact: true },
    { href: "/admin/verifications", label: "Verifications", icon: "verifications", badge: verifications.count ?? 0 },
    { href: "/admin/moderation", label: "Moderation", icon: "moderation", badge: flags.count ?? 0 },
    { href: "/admin/reports", label: "Reports", icon: "reports", badge: reports.count ?? 0 },
    { href: "/admin/users", label: "Sanctions", icon: "sanctions" },
    { href: "/admin/reviews", label: "Reviews", icon: "reviews" },
    { href: "/admin/analytics", label: "Analytics", icon: "analytics" },
    { href: "/admin/data", label: "Platform data", icon: "data" },
    { href: "/admin/settings", label: "Settings", icon: "settings" },
    ...(a.isSuperAdmin ? [{ href: "/admin/staff", label: "Staff", icon: "staff" } as AreaItem] : []),
    { href: "/admin/audit", label: "Audit log", icon: "audit" },
    { href: "/admin/notifications", label: "Notifications", icon: "notifications" },
    { href: "/admin/health", label: "Setup check", icon: "health" },
  ];
  return <AreaShell items={items}>{children}</AreaShell>;
}
