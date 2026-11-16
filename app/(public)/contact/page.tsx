import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import { Block, InfoPage } from "@/components/layout/info-page";

export const metadata: Metadata = { title: "Contact E.Rent" };
const row = "flex min-h-14 items-center gap-3 rounded-[18px] border border-border bg-surface-2 px-4 font-semibold shadow-[var(--shadow-btn)] transition-[transform,border-color] hover:-translate-y-0.5 hover:border-foreground/40 active:translate-y-px";

export default function ContactPage() {
  return (
    <InfoPage title="Contact us" intro="Questions, a problem with a listing, or a landlord who wants help getting started? We read every message.">
      <Block title="Reach us">
        <a className={row} href="https://wa.me/254111473017" target="_blank" rel="noopener noreferrer"><MessageCircle className="size-5 text-accent" aria-hidden />WhatsApp: +254 111 473 017</a>
        <a className={row} href="mailto:ogoradelmus1@gmail.com"><Mail className="size-5 text-accent" aria-hidden />ogoradelmus1@gmail.com</a>
        <p>To report a scam, use the Report button on the listing or chat. It reaches our team directly.</p>
      </Block>
    </InfoPage>
  );
}
