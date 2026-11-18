"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { BellPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/layout/session-provider";
import { saveSearch } from "@/app/account/saved-search-actions";
import { cleanQuery } from "@/lib/saved-search";

/** "Save this search": we check for new matches every hour and tell you in the bell (and by email or WhatsApp if you chose that). */
export function SaveSearchButton() {
  const params = useSearchParams(); const s = useSession();
  const query = cleanQuery(params.toString());
  const [done, setDone] = useState(false); const [msg, setMsg] = useState(""); const [pending, start] = useTransition();
  if (!query) return null;
  if (s.status === "out") return <Button asChild variant="secondary"><Link href={`/sign-in?next=${encodeURIComponent(`/search?${params.toString()}`)}`}><BellPlus className="size-4" aria-hidden />Sign in to get alerts for this search</Link></Button>;
  if (done) return <p role="status" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium"><Check className="size-4 text-link" aria-hidden />Saved. We will tell you when new houses match. <Link href="/account/saved-searches" className="text-link underline underline-offset-4">Manage</Link></p>;
  return (
    <div className="space-y-1">
      <Button variant="secondary" loading={pending} onClick={() => start(async () => { const r = await saveSearch(params.toString()); if (r.ok) { setDone(true); setMsg(""); } else setMsg(r.error ?? "Could not save"); })}><BellPlus className="size-4" aria-hidden />Save this search</Button>
      {msg && <p role="alert" className="text-sm font-medium">Error: {msg}</p>}
    </div>
  );
}
