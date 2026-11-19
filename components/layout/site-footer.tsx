import Link from "next/link";
import { ArrowUp, Mail, MessageCircle } from "lucide-react";
import { LogoArt } from "@/components/brand/logo";

const X = "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z";
const LI = "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z";
const social = [
  { label: "E.Rent on X", href: "https://x.com/OgoraDelmus", d: X },
    { label: "E.Rent on LinkedIn", href: "https://www.linkedin.com/in/delmus-ogora-090510249", d: LI },
] as const;

const cols: { title: string; links: [string, string][] }[] = [
  { title: "Explore", links: [["Search houses", "/search"], ["All 47 counties", "/counties"], ["Student housing", "/search?type=student-housing"]] },
  { title: "Landlords", links: [["For Landlords", "/for-landlords"], ["How it works", "/how-it-works"]] },
  { title: "Company", links: [["About E.Rent", "/about"], ["Contact", "/contact"], ["Safety tips", "/safety"]] },
  { title: "Legal", links: [["Terms", "/legal/terms"], ["Privacy", "/legal/privacy"], ["Cookies", "/legal/cookies"], ["Community standards", "/legal/community-standards"]] },
];

const iconBtn = "inline-flex size-11 items-center justify-center rounded-full border border-border-strong bg-surface-2/80 shadow-[var(--shadow-btn)] transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_18%,transparent)] active:scale-95";

export function SiteFooter() {
  return (
    <footer className="site-footer footer-futuristic relative isolate mt-24 shrink-0 overflow-hidden border-t border-border bg-background">
      {/* Background: the dotted skyline (three traced SVG layers, some windows slowly twinkle), a faint grid and a soft orange glow. All decorative. */}
      <div className="footer-glow" aria-hidden />
      <div className="footer-sky" aria-hidden><i className="sky-a" /><i className="sky-b" /><i className="sky-c" /></div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-24 sm:pt-32">
        <div className="footer-panel">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
            <div className="space-y-5">
              <LogoArt className="h-11" />
              <p className="max-w-xs font-serif text-2xl leading-snug">Never pay before you view in person.</p>
              <ul className="flex gap-2">
                {social.map((s) => (
                  <li key={s.href}><a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className={iconBtn}>
                    <svg viewBox="0 0 24 24" className="size-[18px] fill-current" aria-hidden><path d={s.d} /></svg></a></li>))}
                <li><a href="https://wa.me/254111473017" target="_blank" rel="noopener noreferrer" aria-label="Chat with E.Rent on WhatsApp" className={iconBtn}><MessageCircle className="size-[18px]" aria-hidden /></a></li>
                <li><a href="mailto:ogoradelmus1@gmail.com" aria-label="Email E.Rent" className={iconBtn}><Mail className="size-[18px]" aria-hidden /></a></li>
              </ul>
            </div>
            <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {cols.map((c) => (
                <div key={c.title}>
                  <h2 className="footer-title font-sans">{c.title}</h2>
                  <ul className="mt-3 space-y-0.5">{c.links.map(([l, h]) => <li key={l}><Link href={h} className="footer-link">{l}</Link></li>)}</ul>
                </div>))}
            </nav>
          </div>
        </div>

        <div className="footer-legal mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p className="max-w-3xl text-sm leading-relaxed">© {new Date().getFullYear()} E.Rent. E.Rent is not a party to any rental agreement. Houses, prices and landlords are listed by their owners.</p>
          <a href="#" className="footer-top" aria-label="Back to the top of the page"><ArrowUp className="size-4" aria-hidden />Back to top</a>
        </div>
      </div>
    </footer>
  );
}
