"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/glass-confirm";
import { createClient } from "@/lib/supabase/client";

type Factor = { id: string; friendly_name?: string | null; status: string };
const field = "min-h-12 w-full max-w-xs rounded-[14px] border border-border-strong bg-background/60 px-3.5 text-xl tracking-[0.4em]";

/** Two-step sign-in with an authenticator app (Google Authenticator, Authy, Microsoft Authenticator). */
export function MfaManager({ next }: { next: string }) {
  const supabase = createClient(); const router = useRouter(); const ask = useConfirm();
  const [factors, setFactors] = useState<Factor[]>([]); const [aal, setAal] = useState<string>("aal1");
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [{ data: f }, { data: a }] = await Promise.all([supabase.auth.mfa.listFactors(), supabase.auth.mfa.getAuthenticatorAssuranceLevel()]);
    setFactors((f?.totp ?? []) as Factor[]); setAal(a?.currentLevel ?? "aal1"); setLoaded(true);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  const verified = factors.filter((f) => f.status === "verified");
  async function start() {
    setErr(""); setBusy(true);
    // remove an unfinished earlier attempt first
    for (const f of factors.filter((x) => x.status !== "verified")) await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `E.Rent ${new Date().toISOString().slice(0, 10)}` });
    setBusy(false);
    if (error || !data) { setErr("Could not start. Try again."); return; }
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }
  async function confirm(factorId: string) {
    setErr(""); setBusy(true);
    const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId });
    const { error: e2 } = e1 || !ch ? { error: e1 } : await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.replace(/\s/g, "") });
    setBusy(false);
    if (e1 || e2) { setErr("That code is wrong or has expired. Try the newest code."); return; }
    setCode(""); setEnroll(null); await load(); router.refresh(); if (next) router.push(next);
  }
  async function remove(f: Factor) {
    if (!(await ask({ title: "Turn off two-step sign-in?", message: "Your account will be protected by your password or sign-in method only.", confirmLabel: "Turn off" }))) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
    if (error) setErr("Could not turn it off. Verify with your code first, then try again."); else { await load(); router.refresh(); }
  }

  if (!loaded) return <p className="text-sm text-muted">Loading…</p>;
  return (
    <div className="space-y-6">
      {verified.length > 0 && aal !== "aal2" && (
        <div className="space-y-3 rounded-[24px] border border-border bg-surface p-5"><h2 className="text-xl">Enter your code</h2><p className="text-sm text-muted">Open your authenticator app and type the 6-digit code for E.Rent.</p>
          <label htmlFor="code" className="sr-only">6-digit code</label><input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className={field} />
          <div><Button onClick={() => confirm(verified[0].id)} loading={busy} disabled={code.replace(/\s/g, "").length !== 6}>Verify</Button></div></div>)}
      {verified.length > 0 && aal === "aal2" && (
        <div className="space-y-3 rounded-[24px] border border-border bg-surface p-5"><p className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5 text-link" aria-hidden />Two-step sign-in is on and verified for this session.</p>
          <Button variant="secondary" onClick={() => remove(verified[0])}>Turn it off</Button></div>)}
      {verified.length === 0 && !enroll && (
        <div className="space-y-3 rounded-[24px] border border-border bg-surface p-5"><h2 className="text-xl">Add two-step sign-in</h2><p className="max-w-prose text-sm text-muted">After your password you will type a 6-digit code from an authenticator app. It protects your account if your password leaks. Required for our team.</p>
          <Button onClick={start} loading={busy}>Set it up</Button></div>)}
      {enroll && (
        <div className="space-y-4 rounded-[24px] border border-border bg-surface p-5"><h2 className="text-xl">Scan this with your authenticator app</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="QR code for your authenticator app" className="size-48 rounded-2xl bg-white p-2" />
          <p className="text-sm text-muted">Cannot scan? Enter this key in the app: <code className="break-all font-mono text-foreground">{enroll.secret}</code></p>
          <label htmlFor="code2" className="text-sm font-medium">Then type the 6-digit code it shows</label><input id="code2" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className={field} />
          <div><Button onClick={() => confirm(enroll.id)} loading={busy} disabled={code.replace(/\s/g, "").length !== 6}>Turn on</Button></div></div>)}
      {err && <p role="alert" className="text-sm font-medium">Error: {err}</p>}
    </div>
  );
}
