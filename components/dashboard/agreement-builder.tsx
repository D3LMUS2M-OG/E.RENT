"use client";

import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildAgreement, type AgreementInput } from "@/lib/agreement";

export type ListingOption = { id: string; title: string; rent: number; deposit: number; address: string };
const field = "min-h-11 w-full rounded-[14px] border border-border-strong bg-background/60 px-3.5 text-base";

/** Fill in the details, watch the agreement update, then print it or save it as a PDF. Nothing is stored. */
export function AgreementBuilder({ listings, landlordName }: { listings: ListingOption[]; landlordName: string }) {
  const [d, setD] = useState<AgreementInput>({ landlordName, tenantName: "", premises: "", rent: 0, deposit: 0, dueDay: 5, startDate: "", termMonths: 12, noticeDays: 30, utilities: { water: true, electricity: true, garbage: false, security: false }, pets: false, extra: "" });
  const set = <K extends keyof AgreementInput>(k: K, v: AgreementInput[K]) => setD((x) => ({ ...x, [k]: v }));
  const doc = useMemo(() => buildAgreement(d), [d]);
  const num = (v: string) => Number(v.replace(/\D/g, "")) || 0;
  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
      <form className="no-print space-y-4" onSubmit={(e) => e.preventDefault()} aria-label="Agreement details">
        {listings.length > 0 && <div className="space-y-1.5"><label htmlFor="ls" className="text-sm font-medium">Fill from one of your houses</label>
          <select id="ls" className={field} defaultValue="" onChange={(e) => { const l = listings.find((x) => x.id === e.target.value); if (l) setD((x) => ({ ...x, premises: `${l.title}, ${l.address}`, rent: l.rent, deposit: l.deposit })); }}><option value="">Choose a house</option>{listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</select></div>}
        <div className="space-y-1.5"><label htmlFor="ln" className="text-sm font-medium">Landlord's full name</label><input id="ln" className={field} value={d.landlordName} onChange={(e) => set("landlordName", e.target.value)} /></div>
        <div className="space-y-1.5"><label htmlFor="tn" className="text-sm font-medium">Tenant's full name</label><input id="tn" className={field} value={d.tenantName} onChange={(e) => set("tenantName", e.target.value)} /></div>
        <div className="space-y-1.5"><label htmlFor="pr" className="text-sm font-medium">The house (description and address)</label><textarea id="pr" rows={3} className={`${field} py-2.5`} value={d.premises} onChange={(e) => set("premises", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><label htmlFor="rn" className="text-sm font-medium">Rent (KES / month)</label><input id="rn" inputMode="numeric" className={field} value={d.rent || ""} onChange={(e) => set("rent", num(e.target.value))} /></div>
          <div className="space-y-1.5"><label htmlFor="dp" className="text-sm font-medium">Deposit (KES)</label><input id="dp" inputMode="numeric" className={field} value={d.deposit || ""} onChange={(e) => set("deposit", num(e.target.value))} /></div>
          <div className="space-y-1.5"><label htmlFor="dd" className="text-sm font-medium">Rent due on day</label><select id="dd" className={field} value={d.dueDay} onChange={(e) => set("dueDay", Number(e.target.value))}>{[1, 2, 3, 4, 5, 7, 10, 15, 20, 25, 28].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
          <div className="space-y-1.5"><label htmlFor="sd" className="text-sm font-medium">Starts on</label><input id="sd" type="date" className={field} value={d.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
          <div className="space-y-1.5"><label htmlFor="tm" className="text-sm font-medium">Length</label><select id="tm" className={field} value={d.termMonths} onChange={(e) => set("termMonths", Number(e.target.value))}><option value={0}>Month to month</option>{[6, 12, 24].map((n) => <option key={n} value={n}>{n} months</option>)}</select></div>
          <div className="space-y-1.5"><label htmlFor="nd" className="text-sm font-medium">Notice (days)</label><select id="nd" className={field} value={d.noticeDays} onChange={(e) => set("noticeDays", Number(e.target.value))}>{[14, 30, 60, 90].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
        </div>
        <fieldset className="space-y-1.5"><legend className="text-sm font-medium">The tenant pays for</legend>
          {(["water", "electricity", "garbage", "security"] as const).map((k) => <label key={k} className="flex min-h-11 items-center gap-3 capitalize"><input type="checkbox" className="size-5 accent-[var(--primary)]" checked={d.utilities[k]} onChange={(e) => set("utilities", { ...d.utilities, [k]: e.target.checked })} />{k === "garbage" ? "Garbage collection" : k}</label>)}</fieldset>
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="size-5 accent-[var(--primary)]" checked={d.pets} onChange={(e) => set("pets", e.target.checked)} />Pets are allowed</label>
        <div className="space-y-1.5"><label htmlFor="ex" className="text-sm font-medium">Additional terms (optional)</label><textarea id="ex" rows={4} className={`${field} py-2.5`} value={d.extra} onChange={(e) => set("extra", e.target.value)} placeholder="For example: parking, visitors, quiet hours" /></div>
        <Button type="button" size="lg" className="w-full" onClick={() => window.print()}><Printer className="size-5" aria-hidden />Print or save as PDF</Button>
      </form>

      <article id="agreement-print" className="rounded-[24px] border border-border bg-white p-6 text-black sm:p-10" aria-label="Agreement preview">
        <h2 className="text-center font-serif text-2xl font-bold uppercase tracking-wide text-black">{doc.title}</h2>
        <p className="mt-5 text-[15px] leading-7">{doc.intro}</p>
        <ol className="mt-5 space-y-4 text-[15px] leading-7">{doc.clauses.map((c, i) => <li key={c.heading}><b>{i + 1}. {c.heading}.</b> {c.text}</li>)}</ol>
        <div className="mt-10 grid gap-8 sm:grid-cols-2">{[["Landlord", d.landlordName], ["Tenant", d.tenantName]].map(([r, n]) => <div key={r}><div className="h-12 border-b border-black" /><p className="mt-1 text-sm"><b>{r}</b>{n ? `: ${n}` : ""}</p><p className="text-sm">Signature and date</p></div>)}</div>
        <div className="mt-6 grid gap-8 sm:grid-cols-2">{["Witness 1", "Witness 2"].map((r) => <div key={r}><div className="h-10 border-b border-black" /><p className="mt-1 text-sm">{r}: name, ID number, signature</p></div>)}</div>
        <p className="mt-8 border-t border-black/30 pt-3 text-xs leading-5 text-black/70">{doc.note}</p>
      </article>
    </div>
  );
}
