import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LEGAL_DOCS, LEGAL_EFFECTIVE } from "@/lib/legal";
import { InfoPage } from "@/components/layout/info-page";

export const metadata: Metadata = { title: "Legal", description: "Terms, privacy, cookies and the rules of E.Rent." };

export default function LegalIndex() {
  return (
    <InfoPage title="Legal" intro={`The rules for using E.Rent and how we protect your data. In effect from ${LEGAL_EFFECTIVE}.`}>
      <ul className="space-y-3">{LEGAL_DOCS.map((d) => (
        <li key={d.slug}><Link href={`/legal/${d.slug}`} className="flex items-center justify-between gap-4 rounded-[24px] border border-border bg-surface p-5 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-foreground/40"><span><b className="block text-lg">{d.title}</b><span className="text-sm text-muted">{d.summary}</span></span><ArrowRight className="size-5 shrink-0" aria-hidden /></Link></li>))}</ul>
    </InfoPage>
  );
}
