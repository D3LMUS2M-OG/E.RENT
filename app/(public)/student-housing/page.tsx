import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GraduationCap } from "lucide-react";
import { getFlags } from "@/lib/flags";
import { UNIVERSITIES } from "@/lib/universities";
import { Reveal } from "@/components/home/reveal";

export const metadata: Metadata = { title: "Student housing near your campus", description: "Find hostels, bedsitters and shared rooms within walking distance of Kenyan universities." };
const RADII = [[1000, "1 km"], [3000, "3 km"], [5000, "5 km"]] as const;

export default async function StudentHousing() {
  if (!(await getFlags()).enable_student_mode) redirect("/search?type=student-housing");
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 pb-8 pt-6">
      <Reveal><span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-accent"><GraduationCap className="size-6" aria-hidden /></span>
        <h1 className="mt-4 text-[clamp(2.2rem,6vw,3.6rem)] leading-[1.05]">Student housing near your campus</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">Pick your university and see hostels, bedsitters and shared rooms close by, nearest first. Check the landlord is verified, chat about the rules and the water, then go and see the place.</p>
        <p className="mt-4"><Link href="/search?type=student-housing" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-link underline-offset-4 hover:underline">All student housing<ArrowRight className="size-4" aria-hidden /></Link></p></Reveal>
      <ul className="grid gap-3 sm:grid-cols-2">{UNIVERSITIES.map((u, i) => (
        <Reveal as="li" key={u.slug} d={i % 4}><div className="rounded-[24px] border border-border bg-surface p-5">
          <h2 className="font-sans text-lg font-semibold tracking-normal">{u.name}</h2><p className="text-sm text-muted">{u.town}</p>
          <p className="mt-3 text-sm font-medium">Houses within</p>
          <ul className="mt-1.5 flex flex-wrap gap-2">{RADII.map(([m, l]) => <li key={m}><Link href={`/search?type=student-housing&lat=${u.lat}&lng=${u.lng}&radius_m=${m}&sort=distance`} className="inline-flex min-h-11 items-center rounded-full border border-border-strong px-4 text-sm font-semibold transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-surface-2">{l}</Link></li>)}</ul></div></Reveal>))}</ul>
      <p className="text-sm text-muted">Campus locations are approximate. If your campus is large, choose a wider distance. Your university missing? Use <Link href="/search?type=student-housing" className="text-link underline underline-offset-4">Near me</Link> on the search page.</p>
    </div>
  );
}
