import Link from "next/link";
import { getAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Checklist } from "@/components/account/checklist";

export const metadata = { title: "Move-in checklist", robots: { index: false } };

export default async function ChecklistPage({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
  const { request } = await searchParams;
  const requestId = request && /^[0-9a-f-]{36}$/.test(request) ? request : null;
  await getAccess(`/account/checklist${requestId ? `?request=${requestId}` : ""}`);
  const supabase = await createClient();
  let q = supabase.from("move_in_checklists").select("done, notes");
  q = requestId ? q.eq("request_id", requestId) : q.is("request_id", null);
  const { data } = await q.maybeSingle();
  let title = "";
  if (requestId) { const { data: r } = await supabase.rpc("my_requests"); title = ((r ?? []) as { id: string; listing_title: string }[]).find((x) => x.id === requestId)?.listing_title ?? ""; }
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <div><h1 className="text-4xl">Move-in checklist</h1>{title && <p className="mt-1 font-semibold">{title}</p>}
        <p className="mt-2 max-w-prose text-muted">Go through this when you view the house and again when you move in. Ticks save as you go. <Link href="/safety" className="text-link underline underline-offset-4">Safety tips</Link></p></div>
      <Checklist requestId={requestId} initialDone={data?.done ?? []} initialNotes={data?.notes ?? ""} />
    </div>
  );
}
