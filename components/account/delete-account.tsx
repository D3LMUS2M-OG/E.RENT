"use client";

import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/glass-confirm";
import { deleteMyAccount } from "@/app/account/privacy/actions";

export function DeleteAccount() {
  const ask = useConfirm(); const [text, setText] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function go() {
    setErr("");
    if (!(await ask({ title: "Delete your account for good?", message: "Your profile, listings, messages, reviews you wrote and uploaded files will be removed. This cannot be undone.", confirmLabel: "Delete my account" }))) return;
    setBusy(true); const r = await deleteMyAccount(text); setBusy(false); if (r?.error) setErr(r.error);
  }
  return (
    <div className="space-y-4">
      <div className="space-y-2"><h3 className="font-sans text-lg font-semibold">Two-step sign-in</h3><p className="text-sm text-muted">Protect your account with a code from an authenticator app.</p><Button asChild variant="secondary"><a href="/account/security">Set up two-step sign-in</a></Button></div>
      <div className="space-y-2"><h3 className="font-sans text-lg font-semibold">Download your data</h3><p className="text-sm text-muted">A file with your profile, listings, requests, reviews, saved items and messages we still hold.</p>
        <Button asChild variant="secondary"><a href="/account/export" download><Download className="size-4" aria-hidden />Download my data</a></Button></div>
      <div className="space-y-2 rounded-[20px] border border-danger/50 p-4"><h3 className="font-sans text-lg font-semibold">Delete my account</h3>
        <p className="text-sm text-muted">This removes your account and what you added to E.Rent, including your listings and the files you uploaded. It cannot be undone. If you only want fewer messages, change your <a href="/account/notifications" className="text-link underline underline-offset-4">notification settings</a> instead.</p>
        <label htmlFor="del" className="text-sm font-medium">Type DELETE to confirm</label>
        <input id="del" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className="min-h-11 w-full max-w-xs rounded-[14px] border border-border-strong bg-background/60 px-3.5" />
        {err && <p role="alert" className="text-sm font-medium">Error: {err}</p>}
        <div><Button variant="danger" onClick={go} loading={busy} disabled={text.trim() !== "DELETE"}><Trash2 className="size-4" aria-hidden />Delete my account</Button></div></div>
    </div>
  );
}
