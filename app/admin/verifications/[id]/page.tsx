import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { DecisionForm } from "@/components/verification/decision-form";

export const metadata = { title: "Review verification" };
const LABEL: Record<string, string> = {
  national_id_front: "National ID, front", national_id_back: "National ID, back", proof_of_ownership: "Proof of ownership",
  kra_pin: "KRA PIN", selfie_with_id: "Selfie with ID",
};

export default async function ReviewVerification({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const { id } = await params; const { view } = await searchParams;
  const supabase = await createClient();
  const { data: v } = await supabase.from("landlord_verifications").select("*").eq("id", id).maybeSingle();
  if (!v) notFound();
  const [{ data: profile }, { data: docs }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", v.user_id).maybeSingle(),
    supabase.from("verification_documents").select("id, kind, storage_path, mime").eq("verification_id", id),
  ]);

  // Opening the documents is an audited action: the link below sets ?view=1, which writes the log entry once per open.
  let urls: Record<string, string> = {};
  if (view === "1" && docs?.length) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_audit_log").insert({ actor_id: user!.id, action: "verification.documents_viewed", target_type: "verification", target_id: id, metadata: { count: docs.length } });
    const signed = await supabase.storage.from("verification-docs").createSignedUrls(docs.map((d) => d.storage_path), 300);
    docs.forEach((d, i) => { const u = signed.data?.[i]?.signedUrl; if (u) urls[d.id] = u; });
  }

  return (
    <div className="max-w-3xl space-y-8">
      <Link href="/admin/verifications" className="text-sm underline underline-offset-4">All verifications</Link>
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{profile?.full_name || "Unnamed landlord"}</h1>
        <p className="text-muted">Status: <span className="font-medium capitalize text-foreground">{v.status}</span>
          {v.ownership_kind && ` · Proof: ${v.ownership_kind.replace("_", " ")}`}{profile?.phone && ` · ${profile.phone}`}</p>
        {v.reject_reason && <p className="text-sm">Reason given: {v.reject_reason}</p>}
      </header>

      <section aria-labelledby="docs" className="space-y-3">
        <h2 id="docs" className="text-xl font-semibold">Documents</h2>
        {!docs?.length ? <p className="text-muted">No documents stored.</p> : view !== "1" ? (
          <div className="space-y-2">
            <p className="text-sm text-muted">Opening the documents is recorded in the audit log. Links expire after 5 minutes.</p>
            <Button asChild><Link href={`/admin/verifications/${id}?view=1`}>Open {docs.length} documents</Link></Button>
          </div>
        ) : (
          <ul className="space-y-6">
            {docs.map((d) => (
              <li key={d.id} className="space-y-2">
                <p className="font-medium">{LABEL[d.kind] ?? d.kind}</p>
                {urls[d.id] && (d.mime === "application/pdf"
                  ? <a className="underline underline-offset-4" href={urls[d.id]} target="_blank" rel="noopener noreferrer">Open PDF</a>
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={urls[d.id]} alt={LABEL[d.kind] ?? d.kind} className="max-h-[32rem] rounded-[20px] border border-border bg-surface" />)}
              </li>))}
          </ul>
        )}
      </section>
      <DecisionForm id={id} status={v.status} hasDocs={Boolean(docs?.length)} />
    </div>
  );
}
