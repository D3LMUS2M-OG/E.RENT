import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAccess } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const a = await getAccess("/admin");
  // Not staff: behave as if the page does not exist. Real enforcement is RLS and permission checks in the database.
  if (!a.isStaff) notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="Admin" className="mb-8 flex gap-1 border-b border-border">
        <Button asChild variant="ghost"><Link href="/admin">Overview</Link></Button>
        <Button asChild variant="ghost"><Link href="/admin/verifications">Verifications</Link></Button>
        <Button asChild variant="ghost"><Link href="/admin/health">Setup check</Link></Button>
        <Button asChild variant="ghost"><Link href="/admin/moderation">Moderation</Link></Button>
        <Button asChild variant="ghost"><Link href="/admin/reports">Reports</Link></Button>
        <Button asChild variant="ghost"><Link href="/admin/users">Sanctions</Link></Button>
      </nav>
      {children}
    </div>
  );
}
