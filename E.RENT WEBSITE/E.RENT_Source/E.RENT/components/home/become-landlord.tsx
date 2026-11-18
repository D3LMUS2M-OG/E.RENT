"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { becomeLandlord } from "@/app/(auth)/actions";
import { useSession } from "@/components/layout/session-provider";

export function BecomeLandlord() {
  const s = useSession(); const router = useRouter();
  const [err, setErr] = useState(""); const [pending, start] = useTransition();
  const isLandlord = s.roles.some((r) => ["landlord", "agent", "organization"].includes(r));
  if (s.status === "loading") return <div className="h-12" aria-hidden />;
  if (s.status === "out") return <Button asChild size="lg"><Link href="/sign-up?role=landlord">Create a landlord account<ArrowRight className="size-5" aria-hidden /></Link></Button>;
  if (isLandlord) return <Button asChild size="lg"><Link href="/dashboard/listings/new">Add a house<ArrowRight className="size-5" aria-hidden /></Link></Button>;
  return (
    <div className="space-y-2">
      <Button size="lg" loading={pending} onClick={() => start(async () => { const r = await becomeLandlord(); if (r.error) { setErr(r.error); return; } window.dispatchEvent(new Event("erent:profile-changed")); router.push("/dashboard/verification"); router.refresh(); })}>Add the landlord role to my account</Button>
      {err && <p role="alert" className="text-sm font-medium">Error: {err}</p>}
    </div>
  );
}
