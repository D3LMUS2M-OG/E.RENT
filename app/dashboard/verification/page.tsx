import { BadgeCheck } from "lucide-react";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { VerificationPanel, type Doc } from "@/components/verification/verification-panel";
import { VerifiedBadge } from "@/components/ui/verified-badge";

export const metadata = { title: "Verification" };

export default async function VerificationPage() {
  const a = await getAccess("/dashboard/verification");
  const supabase = await createClient();
  const { data: v } = await supabase.from("landlord_verifications").select("id, status, ownership_kind, reject_reason").eq("user_id", a.userId).maybeSingle();
  const { data: docs } = v ? await supabase.from("verification_documents").select("id, kind, mime").eq("verification_id", v.id) : { data: [] };

  return (
    <div className="max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Get verified</h1>
        <p className="max-w-xl text-muted">Verified landlords get a badge on their profile and every listing. Tenants trust and answer them more. You can publish listings without it.</p>
      </header>
      {!a.isLandlord ? (
        <p className="text-muted">Only landlords can be verified. Caretakers and agents are verified through the landlord they work for.</p>
      ) : v?.status === "approved" ? (
        <div className="space-y-3"><VerifiedBadge /><p className="flex items-center gap-2"><BadgeCheck className="size-5" aria-hidden />You are verified. Your badge shows on your profile and listings.</p></div>
      ) : (
        <VerificationPanel status={v?.status ?? "draft"} ownership={v?.ownership_kind ?? null} docs={(docs ?? []) as Doc[]} rejectReason={v?.reject_reason ?? null} />
      )}
    </div>
  );
}
