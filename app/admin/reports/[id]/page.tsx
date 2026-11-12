import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { SanctionForm } from "@/components/chat/sanction-form";

export const metadata = { title: "Review report" };

export default async function ReviewReport({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const { id } = await params; const { view } = await searchParams;
  const supabase = await createClient();
  const { data: r } = await supabase.from("reports").select("*").eq("id", id).maybeSingle();
  if (!r) notFound();
  const { data: names } = await supabase.from("profiles").select("id, full_name").in("id", [r.reporter_id, r.reported_user_id]);
  const name = (uid: string) => names?.find((n) => n.id === uid)?.full_name || "Unnamed";

  // Reading a conversation is an audited action: the link sets ?view=1 and each open writes one log entry.
  type Ev = { id: string; sender_id: string; kind: string; body: string | null; attachment_name: string | null; evidence_path: string | null; sent_at: string; was_deleted: boolean };
  let evidence: Ev[] = []; const urls: Record<string, string> = {};
  if (view === "1") {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_audit_log").insert({ actor_id: user!.id, action: "report.conversation_opened", target_type: "report", target_id: id, metadata: {} });
    const { data } = await supabase.from("report_evidence").select("id, sender_id, kind, body, attachment_name, evidence_path, sent_at, was_deleted").eq("report_id", id).order("sent_at");
    evidence = (data ?? []) as Ev[];
    const paths = evidence.map((e) => e.evidence_path).filter(Boolean) as string[];
    if (paths.length) {
      const signed = await supabase.storage.from("report-evidence").createSignedUrls(paths, 300);
      signed.data?.forEach((s) => { if (s.path && s.signedUrl) urls[s.path] = s.signedUrl; });
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <Link href="/admin/reports" className="text-sm underline underline-offset-4">All reports</Link>
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight capitalize">{r.reason.replace("_", " ")}</h1>
        <p className="text-muted">{name(r.reporter_id)} reported {name(r.reported_user_id)} · {new Date(r.created_at).toLocaleDateString("en-KE")} · <span className="capitalize">{r.status}</span></p>
        {r.details && <p className="rounded-md bg-surface p-3 text-sm">{r.details}</p>}
      </header>

      <section aria-labelledby="conv" className="space-y-3">
        <h2 id="conv" className="text-xl font-semibold">Conversation</h2>
        {view !== "1" ? (
          <div className="space-y-2"><p className="text-sm text-muted">Opening the conversation is recorded in the audit log.</p>
            <Button asChild><Link href={`/admin/reports/${id}?view=1`}>Open the conversation</Link></Button></div>
        ) : evidence.length === 0 ? <p className="text-muted">No messages were saved with this report.</p> : (
          <ul className="space-y-2">
            {evidence.map((e) => (
              <li key={e.id} className={`max-w-[85%] rounded-[20px] border border-border bg-surface p-3 ${e.sender_id === r.reported_user_id ? "ml-auto bg-surface" : ""}`}>
                <p className="text-xs text-muted">{name(e.sender_id)}{e.sender_id === r.reported_user_id ? " (reported)" : " (reporter)"} · {new Date(e.sent_at).toLocaleString("en-KE")}{e.was_deleted && " · deleted by the sender"}</p>
                {e.kind === "text" ? <p className="whitespace-pre-wrap">{e.body}</p>
                  : e.evidence_path && urls[e.evidence_path]
                    ? (e.kind === "image"
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={urls[e.evidence_path]} alt="Evidence" className="mt-1 max-h-72 rounded-md" />
                        : <a className="underline underline-offset-4" href={urls[e.evidence_path]} target="_blank" rel="noopener noreferrer">{e.attachment_name ?? e.kind}</a>)
                    : <p className="text-sm text-muted">{e.kind} attachment was not preserved</p>}
              </li>))}
          </ul>)}
      </section>

      {r.status === "open" ? (
        <section aria-labelledby="act" className="space-y-3"><h2 id="act" className="text-xl font-semibold">Action on {name(r.reported_user_id)}</h2>
          <SanctionForm reportId={id} userId={r.reported_user_id} /></section>
      ) : <p className="text-sm text-muted">Closed{r.resolution_note ? `: ${r.resolution_note}` : ""}.</p>}
    </div>
  );
}
