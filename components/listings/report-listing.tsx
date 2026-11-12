"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportListing } from "@/app/chats/actions";

const REASONS = [["scam", "It looks like a scam"], ["fake_listing", "The photos or house are not real"], ["wrong_info", "The details are wrong"], ["inappropriate", "Inappropriate content"], ["other", "Something else"]] as const;

export function ReportListing({ listingId }: { listingId: string }) {
  const [msg, setMsg] = useState(""); const [pending, setPending] = useState(false);
  return (
    <details className="text-sm">
      <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-muted underline-offset-4 hover:underline"><Flag className="size-4" aria-hidden />Report this listing</summary>
      <form className="mt-2 space-y-2" onSubmit={async (e) => {
        e.preventDefault(); setPending(true); const f = new FormData(e.currentTarget);
        const r = await reportListing(listingId, String(f.get("reason")), String(f.get("details") ?? ""));
        setPending(false); setMsg(r.error ? `Error: ${r.error}` : r.message ?? "Reported");
      }}>
        <select name="reason" aria-label="Reason" className="min-h-11 w-full rounded-[14px] border border-border-strong bg-surface px-3 text-base">{REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <textarea name="details" rows={2} maxLength={1000} aria-label="Details" placeholder="Tell us more (optional)" className="w-full rounded-[14px] border border-border-strong bg-surface p-2 text-base" />
        <Button type="submit" variant="secondary" loading={pending}>Send report</Button>
        {msg && <p role="status" className="font-medium">{msg}</p>}
      </form>
    </details>
  );
}
