"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { addItem, renameItem, setActive, type DataState } from "@/app/admin/data/actions";

type Item = { id: number; name: string; slug: string; is_active: boolean; category?: string };
type Table = "property_types" | "amenities";

function Row({ table, item }: { table: Table; item: Item }) {
  const [name, setName] = useState(item.name);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-[16px] border border-border bg-surface p-2.5 pl-4">
      <label className="sr-only" htmlFor={`${table}-${item.id}`}>Name</label>
      <input id={`${table}-${item.id}`} value={name} onChange={(e) => setName(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-[12px] bg-transparent px-1 text-[15px] font-medium focus:bg-background/60" />
      {item.category && <span className="text-xs text-muted">{item.category}</span>}
      {name.trim() !== item.name && <Button variant="secondary" loading={saving} onClick={async () => { setSaving(true); const r = await renameItem(table, item.id, name); setSaving(false); setErr(r.error ?? ""); }}>Save</Button>}
      <ActionButton variant={item.is_active ? "ghost" : "secondary"} action={setActive.bind(null, table, item.id, !item.is_active)}>{item.is_active ? "Hide" : "Show again"}</ActionButton>
      {err && <p role="alert" className="w-full text-sm font-medium">Error: {err}</p>}
    </li>
  );
}

export function DataList({ table, title, hint, items }: { table: Table; title: string; hint: string; items: Item[] }) {
  const [state, action, pending] = useActionState<DataState, FormData>(addItem.bind(null, table), {});
  return (
    <section aria-label={title} className="space-y-3">
      <div><h2 className="text-2xl">{title}</h2><p className="text-sm text-muted">{hint}</p></div>
      <form action={action} className="flex flex-wrap gap-2">
        <label htmlFor={`new-${table}`} className="sr-only">New name</label>
        <input id={`new-${table}`} name="name" required placeholder="Add a new one" className="min-h-11 min-w-0 flex-1 rounded-full border border-border-strong bg-background/60 px-4" />
        {table === "amenities" && <><label htmlFor="cat" className="sr-only">Group</label><input id="cat" name="category" placeholder="Group, for example security" className="min-h-11 w-48 rounded-full border border-border-strong bg-background/60 px-4" /></>}
        <Button type="submit" loading={pending}>Add</Button>
        {state.error && <p role="alert" className="w-full text-sm font-medium">Error: {state.error}</p>}
      </form>
      <ul className="space-y-1.5">{items.map((i) => <Row key={i.id} table={table} item={i} />)}</ul>
    </section>
  );
}
