"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, BellOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/glass-confirm";
import { createClient } from "@/lib/supabase/client";

type Row = { id: string; name: string; query: string; alert: boolean };

export function SavedSearchList({ rows: initial }: { rows: Row[] }) {
  const supabase = createClient(); const router = useRouter(); const ask = useConfirm();
  const [rows, setRows] = useState(initial); const [err, setErr] = useState("");
  async function toggle(r: Row) {
    setErr(""); const { error } = await supabase.from("saved_searches").update({ alert: !r.alert, last_checked_at: new Date().toISOString() }).eq("id", r.id);
    if (error) setErr("Could not change that. Try again."); else setRows(rows.map((x) => (x.id === r.id ? { ...x, alert: !r.alert } : x)));
  }
  async function remove(r: Row) {
    if (!(await ask({ title: "Delete this saved search?", message: r.name, confirmLabel: "Delete" }))) return;
    const { error } = await supabase.from("saved_searches").delete().eq("id", r.id);
    if (error) setErr("Could not delete it. Try again."); else { setRows(rows.filter((x) => x.id !== r.id)); router.refresh(); }
  }
  if (rows.length === 0) return <p className="max-w-md text-muted">Nothing saved yet. Search for houses, then tap <b className="text-foreground">Save this search</b> to get an alert when new ones match.</p>;
  return (
    <div className="space-y-3">
      {err && <p role="alert" className="text-sm font-medium">Error: {err}</p>}
      <ul className="space-y-2">{rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-[20px] border border-border bg-surface p-3 pl-5">
          <Link href={`/search?${r.query}`} className="min-w-0 flex-1 py-1.5 font-semibold underline-offset-4 hover:underline">{r.name}</Link>
          <Button variant={r.alert ? "primary" : "secondary"} aria-pressed={r.alert} onClick={() => toggle(r)}>{r.alert ? <Bell className="size-4" aria-hidden /> : <BellOff className="size-4" aria-hidden />}{r.alert ? "Alerts on" : "Alerts off"}</Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${r.name}`} onClick={() => remove(r)}><Trash2 className="size-5" aria-hidden /></Button>
        </li>))}</ul>
    </div>
  );
}
