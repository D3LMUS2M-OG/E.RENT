import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL_DOCS, LEGAL_EFFECTIVE, LEGAL_VERSION, legalBySlug } from "@/lib/legal";

export function generateStaticParams() { return LEGAL_DOCS.map((d) => ({ slug: d.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = legalBySlug((await params).slug); return d ? { title: d.title, description: d.summary, alternates: { canonical: `/legal/${d.slug}` } } : { title: "Legal" };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const d = legalBySlug((await params).slug); if (!d) notFound();
  const id = (i: number) => `s${i + 1}`;
  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-6">
      <p className="text-sm text-muted"><Link href="/legal" className="underline-offset-4 hover:underline">Legal</Link> · Version {LEGAL_VERSION} · Effective {LEGAL_EFFECTIVE}</p>
      <h1 className="mt-2 text-[clamp(2rem,5.5vw,3.4rem)] leading-[1.05]">{d.title}</h1>
      <p className="mt-4 text-lg text-muted">{d.intro}</p>
      <nav aria-label="Contents" className="mt-8 rounded-[24px] border border-border bg-surface p-5"><p className="font-semibold">Contents</p>
        <ol className="mt-2 columns-1 gap-8 text-[15px] sm:columns-2">{d.sections.map((s, i) => <li key={s.heading} className="break-inside-avoid"><a href={`#${id(i)}`} className="inline-flex min-h-10 items-center text-link underline-offset-4 hover:underline">{i + 1}. {s.heading}</a></li>)}</ol></nav>
      <div className="mt-10 space-y-9">
        {d.sections.map((s, i) => (
          <section key={s.heading} id={id(i)} aria-labelledby={`${id(i)}-h`} className="scroll-mt-28">
            <h2 id={`${id(i)}-h`} className="text-2xl">{i + 1}. {s.heading}</h2>
            <div className="mt-3 space-y-3 text-[16px] leading-7">{s.body.map((b, j) => Array.isArray(b)
              ? <ul key={j} className="list-disc space-y-1.5 pl-6">{b.map((li) => <li key={li}>{li}</li>)}</ul>
              : <p key={j}>{b}</p>)}</div>
          </section>))}
      </div>
      <p className="mt-12 border-t border-border pt-5 text-sm text-muted">Questions about this document? <Link href="/contact" className="text-link underline underline-offset-4">Contact us</Link>. See also our other <Link href="/legal" className="text-link underline underline-offset-4">legal documents</Link>.</p>
    </div>
  );
}
