"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getDocUploadTarget, registerDocument, removeDocument, saveOwnershipKind, submitVerification, withdrawVerification, type DocKind } from "@/app/dashboard/verification/actions";

export type Doc = { id: string; kind: DocKind; mime: string | null };
const SLOTS: { kind: DocKind; label: string; hint: string; required: boolean }[] = [
  { kind: "national_id_front", label: "National ID, front", hint: "All four corners visible and readable", required: true },
  { kind: "national_id_back", label: "National ID, back", hint: "Optional but speeds up review", required: false },
  { kind: "proof_of_ownership", label: "Proof of ownership", hint: "Title deed, lease or recent utility bill in your name", required: true },
  { kind: "kra_pin", label: "KRA PIN certificate", hint: "Optional supporting document", required: false },
  { kind: "selfie_with_id", label: "Selfie holding your ID", hint: "Optional supporting document", required: false },
];
const OWNERSHIP = [["title_deed", "Title deed"], ["lease", "Lease"], ["utility_bill", "Utility bill"]] as const;

export function VerificationPanel({ status, ownership, docs, rejectReason }: { status: string; ownership: string | null; docs: Doc[]; rejectReason: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const locked = !(status === "draft" || status === "rejected");
  const byKind = new Map(docs.map((d) => [d.kind, d]));

  async function upload(kind: DocKind, file: File | undefined) {
    if (!file) return;
    setBusy(kind); setError("");
    const t = await getDocUploadTarget(kind, { type: file.type, size: file.size });
    if (t.error || !t.path || !t.token) { setError(t.error ?? "Upload failed"); setBusy(null); return; }
    const { error: ue } = await createClient().storage.from("verification-docs").uploadToSignedUrl(t.path, t.token, file);
    if (ue) { setError(ue.message); setBusy(null); return; }
    const r = await registerDocument(kind, t.path, file.type);
    if (r.error) setError(r.error);
    setBusy(null); router.refresh();
  }
  const run = (fn: () => Promise<{ error?: string }>) => start(async () => { const r = await fn(); setError(r.error ?? ""); router.refresh(); });

  const ready = byKind.has("national_id_front") && byKind.has("proof_of_ownership") && Boolean(ownership);

  return (
    <div className="space-y-8">
      {status === "rejected" && <p role="alert" className="rounded-lg border-2 border-border-strong p-4 text-sm font-medium">Not approved: {rejectReason}. Fix the documents below and submit again.</p>}
      {status === "pending" && <p role="status" className="rounded-lg border border-border p-4 text-sm font-medium">Submitted and waiting for a verifier. Documents can no longer be changed.</p>}

      <fieldset className="space-y-2" disabled={locked}>
        <legend className="text-sm font-medium">What kind of proof of ownership are you sending?</legend>
        <div className="flex flex-wrap gap-2">
          {OWNERSHIP.map(([v, l]) => (
            <label key={v} className="flex min-h-11 items-center gap-2 rounded-md border border-border px-3">
              <input type="radio" name="ownership" value={v} defaultChecked={ownership === v} className="size-4 accent-[var(--primary)]" onChange={() => run(() => saveOwnershipKind(v))} />{l}
            </label>))}
        </div>
      </fieldset>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {SLOTS.map((s) => {
          const d = byKind.get(s.kind);
          return (
            <li key={s.kind} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{s.label}{s.required ? "" : " (optional)"}</p>
                <p className="text-sm text-muted">{s.hint}</p>
              </div>
              <div className="flex items-center gap-2">
                {d && <span className="flex items-center gap-1 text-sm font-medium"><CheckCircle2 className="size-4" aria-hidden />Uploaded</span>}
                {!locked && (<>
                  <input ref={(el) => { refs.current[s.kind] = el; }} type="file" hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => upload(s.kind, e.target.files?.[0])} />
                  <Button type="button" variant="secondary" loading={busy === s.kind} onClick={() => refs.current[s.kind]?.click()}><FileUp className="size-4" aria-hidden />{d ? "Replace" : "Upload"}</Button>
                  {d && <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${s.label}`} onClick={() => run(() => removeDocument(d.id))}><Trash2 className="size-4" aria-hidden /></Button>}
                </>)}
              </div>
            </li>);
        })}
      </ul>

      {error && <p role="alert" className="text-sm font-medium">Error: {error}</p>}
      <div className="flex flex-wrap gap-3">
        {!locked && <Button size="lg" disabled={!ready} loading={pending} onClick={() => run(submitVerification)}>Submit for review</Button>}
        {status === "pending" && <Button variant="secondary" loading={pending} onClick={() => run(withdrawVerification)}>Withdraw to edit</Button>}
      </div>
      {!locked ? <p className="text-sm text-muted">Documents are stored privately, shown only to verifiers, and deleted after the decision.</p> : null}
    </div>
  );
}
