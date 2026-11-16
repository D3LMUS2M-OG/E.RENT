import { Reveal } from "@/components/home/reveal";

/** Shared layout for the simple information pages. */
export function InfoPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-8 pt-6">
      <Reveal><h1 className="text-[clamp(2.2rem,6vw,3.6rem)] leading-[1.05]">{title}</h1><p className="mt-4 text-lg text-muted">{intro}</p></Reveal>
      <div className="mt-10 space-y-5">{children}</div>
    </div>
  );
}
export function Block({ title, children, d = 0 }: { title: string; children: React.ReactNode; d?: number }) {
  return <Reveal d={d}><section className="rounded-[28px] border border-border bg-surface p-6"><h2 className="text-2xl">{title}</h2><div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted">{children}</div></section></Reveal>;
}
